-- =====================================================================
-- Weg-Stile: einmal kaufen, unbegrenzt platzieren
-- =====================================================================
-- Voraussetzung: sql/path-items.sql wurde ausgeführt.
--
-- 1. Alle Weg-Stile (category = 'path_style') bekommen
--    attributes.unlimited_placement = true und stackable = false.
-- 2. purchase_item(): ein Item mit unlimited_placement kann nur einmal
--    gekauft werden ('Item already owned'), Menge immer 1.
-- 3. place_garden_object(): unverändert kein Inventar-Verbrauch für
--    Wegstücke (Berechtigung über den gekauften Stil); grown_at ist bei
--    Wegstücken jetzt immer null, auch mit p_use_grown = true.
-- 4. remove_garden_object(): unverändert gegenüber Dev, hier mit
--    aufgenommen, damit Prod sicher die Weg-Logik hat (nichts zurück ins
--    Inventar legen).
--
-- Idempotent. Das Ergebnis-Grid am Ende zeigt, wie viele Stile markiert
-- wurden; ohne Treffer bricht das Skript ab, bevor Funktionen ersetzt
-- werden.
-- =====================================================================

drop table if exists pg_temp.paths_unlimited_report;
create temp table paths_unlimited_report (
  path_styles_marked integer not null
);

do $$
declare
  v_marked integer;
begin
  update public.item_catalog
  set attributes = attributes || '{"unlimited_placement": true}'::jsonb,
      stackable  = false,
      updated_at = now()
  where category = 'path_style';

  get diagnostics v_marked = row_count;

  if v_marked = 0 then
    raise exception 'No path styles found (category = path_style). Run sql/path-items.sql first.';
  end if;

  insert into paths_unlimited_report values (v_marked);
end;
$$;


-- ---------------------------------------------------------------------
-- purchase_item
-- ---------------------------------------------------------------------
create or replace function public.purchase_item(p_item_id uuid, p_quantity integer default 1)
returns public.purchases
language plpgsql security definer
set search_path = public
as $$
declare
  v_profile_id     uuid := auth.uid();
  v_item           public.item_catalog;
  v_total_price    integer;
  v_purchase       public.purchases;
  v_level          integer;
begin
  if p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  select * into v_item from public.item_catalog where id = p_item_id and active = true;
  if not found then
    raise exception 'Item not found or inactive';
  end if;

  if not v_item.stackable and p_quantity > 1 then
    raise exception 'Item is not stackable, quantity must be 1';
  end if;

  -- Einmal-Kauf (z.B. Weg-Stile): nur kaufbar, solange der Nutzer das
  -- Item noch nicht besitzt.
  if coalesce((v_item.attributes ->> 'unlimited_placement')::boolean, false) then
    if p_quantity <> 1 then
      raise exception 'Item can only be purchased once, quantity must be 1';
    end if;

    -- Sperrt die Profilzeile bis Transaktionsende, damit zwei nahezu
    -- gleichzeitige Käufe nicht beide die Besitzprüfung passieren.
    perform 1 from public.profiles where id = v_profile_id for update;

    if exists (
      select 1 from public.inventory
      where profile_id = v_profile_id
        and item_id = p_item_id
        and quantity > 0
    ) then
      raise exception 'Item already owned';
    end if;
  end if;

  select public.get_level(xp) into v_level from public.profiles where id = v_profile_id;
  if v_level < v_item.unlock_level then
    raise exception 'Item requires level %, current level %', v_item.unlock_level, v_level;
  end if;

  v_total_price := v_item.price * p_quantity;

  update public.profiles
  set coins = coins - v_total_price
  where id = v_profile_id and coins >= v_total_price;

  if not found then
    raise exception 'Not enough coins';
  end if;

  insert into public.purchases (profile_id, item_id, quantity, price_paid)
  values (v_profile_id, p_item_id, p_quantity, v_total_price)
  returning * into v_purchase;

  insert into public.inventory (profile_id, item_id, is_grown, quantity)
  values (v_profile_id, p_item_id, false, p_quantity)
  on conflict (profile_id, item_id, is_grown)
  do update set quantity = public.inventory.quantity + excluded.quantity, updated_at = now();

  return v_purchase;
end;
$$;


-- ---------------------------------------------------------------------
-- place_garden_object
-- ---------------------------------------------------------------------
create or replace function public.place_garden_object(
  p_item_id uuid,
  p_world_id integer,
  p_grid_x integer,
  p_grid_y integer,
  p_pos_x double precision default 50,
  p_pos_y double precision default 50,
  p_rotation double precision default 0,
  p_scale double precision default 1,
  p_use_grown boolean default false
)
returns public.garden_objects
language plpgsql security definer
set search_path = public
as $$
declare
  v_profile_id     uuid := auth.uid();
  v_item           public.item_catalog;
  v_world          public.worlds;
  v_obj            public.garden_objects;
  v_path_shape     text;
  v_style_item_id  uuid;
  v_style_owned    boolean;
begin
  select * into v_item from public.item_catalog where id = p_item_id and active = true;
  if not found then
    raise exception 'Item not found or inactive';
  end if;

  if not v_item.placeable then
    raise exception 'Item is not placeable';
  end if;

  if v_item.world_id is not null and v_item.world_id <> p_world_id then
    raise exception 'Item is not available in this world';
  end if;

  select * into v_world from public.worlds where id = p_world_id;
  if not found then
    raise exception 'World not found';
  end if;

  -- Weltgrenzen: der gesamte Footprint (nicht nur die obere linke Ecke)
  -- muss innerhalb von 0..grid_width-1 x 0..grid_height-1 liegen.
  if p_grid_x < 0 or p_grid_y < 0
     or p_grid_x + v_item.footprint_width  > v_world.grid_width
     or p_grid_y + v_item.footprint_height > v_world.grid_height then
    raise exception 'Placement is outside world grid bounds';
  end if;

  -- Serialisiert Platzierungen desselben Nutzers/derselben Welt innerhalb
  -- dieser Transaktion, damit zwei nahezu gleichzeitige Requests nicht
  -- beide dieselbe freie Zelle als "frei" sehen und kollidierend
  -- einfügen. Wird am Transaktionsende automatisch freigegeben.
  perform pg_advisory_xact_lock(hashtextextended(v_profile_id::text || ':' || p_world_id::text, 0));

  -- Kollision: Achsen-parallele Rechteck-Überlappung (AABB) zwischen dem
  -- neuen Footprint und jedem bereits platzierten Objekt desselben Nutzers
  -- in derselben Welt.
  if exists (
    select 1
    from public.garden_objects go
    join public.item_catalog ic on ic.id = go.item_id
    where go.profile_id = v_profile_id
      and go.world_id = p_world_id
      and p_grid_x < go.grid_x + ic.footprint_width
      and p_grid_x + v_item.footprint_width > go.grid_x
      and p_grid_y < go.grid_y + ic.footprint_height
      and p_grid_y + v_item.footprint_height > go.grid_y
  ) then
    raise exception 'Grid cells already occupied';
  end if;

  v_path_shape := v_item.attributes ->> 'path_shape';

  if v_path_shape is not null then
    -- Wegstück: kein Inventar-Verbrauch -- die Berechtigung kommt aus dem
    -- einmalig gekauften Stil-Freischalt-Item (siehe sql/path-items.sql
    -- und sql/paths-unlimited-placement.sql). Unbegrenzt oft platzierbar,
    -- sobald der Stil einmal gekauft wurde.
    v_style_item_id := (v_item.attributes ->> 'path_style_item_id')::uuid;

    if v_style_item_id is null then
      raise exception 'Path item % is missing attributes.path_style_item_id', v_item.name;
    end if;

    select exists (
      select 1 from public.inventory
      where profile_id = v_profile_id
        and item_id = v_style_item_id
        and quantity >= 1
    ) into v_style_owned;

    if not v_style_owned then
      raise exception 'Path style not unlocked yet.';
    end if;
  else
    -- Alle anderen Items: unverändertes Verhalten -- ein Exemplar aus dem
    -- Inventar verbrauchen.
    update public.inventory
    set quantity = quantity - 1, updated_at = now()
    where profile_id = v_profile_id
      and item_id = p_item_id
      and is_grown = p_use_grown
      and quantity > 0;

    if not found then
      raise exception 'Item not available in inventory';
    end if;
  end if;

  insert into public.garden_objects (
    profile_id, item_id, world_id, grid_x, grid_y, pos_x, pos_y, rotation, scale, planted_at, grown_at
  ) values (
    v_profile_id, p_item_id, p_world_id, p_grid_x, p_grid_y, p_pos_x, p_pos_y, p_rotation, p_scale,
    now(),
    -- Wegstücke wachsen nicht: grown_at bleibt null, auch wenn der Client
    -- p_use_grown mitschickt.
    case when p_use_grown and v_path_shape is null then now() else null end
  )
  returning * into v_obj;

  return v_obj;
end;
$$;


-- ---------------------------------------------------------------------
-- remove_garden_object (unverändert gegenüber Dev)
-- ---------------------------------------------------------------------
create or replace function public.remove_garden_object(p_garden_object_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_profile_id   uuid := auth.uid();
  v_obj          public.garden_objects;
  v_path_shape   text;
begin
  select * into v_obj
  from public.garden_objects
  where id = p_garden_object_id and profile_id = v_profile_id
  for update;

  if not found then
    raise exception 'Garden object not found';
  end if;

  select ic.attributes ->> 'path_shape' into v_path_shape
  from public.item_catalog ic
  where ic.id = v_obj.item_id;

  delete from public.garden_objects where id = p_garden_object_id;

  -- Wegstücke wurden beim Platzieren nie aus dem Inventar entnommen (siehe
  -- place_garden_object oben) -- beim Entfernen also auch nichts zurücklegen.
  if v_path_shape is null then
    insert into public.inventory (profile_id, item_id, is_grown, quantity)
    values (v_profile_id, v_obj.item_id, (v_obj.grown_at is not null), 1)
    on conflict (profile_id, item_id, is_grown)
    do update set quantity = public.inventory.quantity + 1, updated_at = now();
  end if;
end;
$$;


select path_styles_marked from paths_unlimited_report;
