-- ============================================================================
-- MIGRATION: garden-move-rotation.sql   (functions + trigger, no table change)
-- ============================================================================
-- WAS:    1. garden_footprint_swapped(rotation): bei 90°/270° tauschen
--            Breite und Höhe des Footprints (z. B. die Hecke, 2x1 -> 1x2).
--         2. place_garden_object(): Rand- und Kollisionsprüfung mit dem
--            gedrehten Footprint — für das neue UND die bestehenden Objekte.
--            Signatur, Verhalten und Fehlertexte sonst unverändert
--            (Basis: sql/paths-unlimited-placement.sql).
--         3. move_garden_object(): verschiebt/dreht ein eigenes Objekt
--            (grid_x/grid_y, pos_x/pos_y, rotation) mit derselben Rand- und
--            Kollisionsprüfung, das Objekt selbst ausgenommen. planted_at /
--            grown_at bleiben unverändert -> Wachstum geht nicht verloren.
--         4. protect_garden_object_fields(): Clients dürfen grid_x/grid_y,
--            rotation und scale nicht mehr direkt ändern (nur noch
--            pos_x/pos_y). Verschieben und Drehen laufen ausschließlich
--            über move_garden_object(), das die Kollision prüft.
--
-- WARUM:  Der Edit-Modus der Garden-Seite (Move/Rotate) braucht eine
--         serverseitig geprüfte Positionsänderung; vorher war grid_x/grid_y
--         per direktem UPDATE ungeprüft änderbar.
--
-- place_garden_object / remove_garden_object nach Punkt 4:
--         Beide sind SECURITY DEFINER (current_user = 'postgres') und
--         machen INSERT bzw. DELETE — der BEFORE-UPDATE-Trigger greift dort
--         gar nicht. move_garden_object macht ein UPDATE, ist aber ebenfalls
--         SECURITY DEFINER und damit vom Trigger ausgenommen.
--
-- rotation ist gesperrt, weil eine gedrehte Hecke einen anderen
--         Footprint belegt — ein direktes UPDATE umginge die
--         Kollisionsprüfung. scale ist gesperrt, weil der Client sie nie
--         direkt setzt (Änderungen laufen nur über Funktionen).
--
-- ABLAUF: 1. Auf Dev-Supabase ausführen, Verifikation (unten) laufen lassen
--         2. Branch dev testen
--         3. VOR DEM MERGE dev -> main AUCH AUF robin-prod ausführen
--            (+ Verifikation). Der Client ruft move_garden_object() auf —
--            ohne dieses Skript schlägt auf Prod jedes Move/Rotate fehl.
--
-- SCHEMA-DATEI: Für die konsolidierte bloomly-schema.sql vorgemerkt
--         (Funktionen + Trigger aus diesem Skript übernehmen).
--
-- IDEMPOTENT: nur create or replace; beliebig oft ausführbar.
--
-- ----------------------------------------------------------------------------
-- VERIFIKATION — NACH dem Lauf
-- ----------------------------------------------------------------------------
-- (1) Bestehende Überlappungen mit gedrehten Footprints (erwartet: keine
--     Zeilen; sonst sind das gedrehte Hecken, die jetzt in Nachbarn ragen —
--     im Edit-Modus verschieben oder einlagern):
--
--   with f as (
--     select go.id, go.profile_id, go.world_id, go.grid_x, go.grid_y, ic.name,
--            case when public.garden_footprint_swapped(go.rotation)
--                 then ic.footprint_height else ic.footprint_width end as w,
--            case when public.garden_footprint_swapped(go.rotation)
--                 then ic.footprint_width else ic.footprint_height end as h
--     from public.garden_objects go
--     join public.item_catalog ic on ic.id = go.item_id
--   )
--   select a.name, a.grid_x, a.grid_y, b.name, b.grid_x, b.grid_y
--   from f a join f b
--     on a.profile_id = b.profile_id and a.world_id = b.world_id and a.id < b.id
--    and a.grid_x < b.grid_x + b.w and a.grid_x + a.w > b.grid_x
--    and a.grid_y < b.grid_y + b.h and a.grid_y + a.h > b.grid_y;
--
-- (2) Objekte außerhalb der Welt mit gedrehtem Footprint (erwartet: keine):
--
--   select go.id, ic.name, go.grid_x, go.grid_y, go.rotation
--   from public.garden_objects go
--   join public.item_catalog ic on ic.id = go.item_id
--   join public.worlds w on w.id = go.world_id
--   where go.grid_x + case when public.garden_footprint_swapped(go.rotation)
--                          then ic.footprint_height else ic.footprint_width end > w.grid_width
--      or go.grid_y + case when public.garden_footprint_swapped(go.rotation)
--                          then ic.footprint_width else ic.footprint_height end > w.grid_height;
--
-- (3) Funktionen vorhanden und für Clients ausführbar (erwartet: 3x true):
--
--   select has_function_privilege('authenticated',
--            'public.move_garden_object(uuid, integer, integer, double precision, double precision, double precision)', 'execute'),
--          has_function_privilege('authenticated',
--            'public.place_garden_object(uuid, integer, integer, integer, double precision, double precision, double precision, double precision, boolean)', 'execute'),
--          has_function_privilege('authenticated',
--            'public.remove_garden_object(uuid)', 'execute');
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. garden_footprint_swapped
-- ----------------------------------------------------------------------------
-- Muss zu footprintForRotation() in lib/garden/garden-layout.ts passen.
create or replace function public.garden_footprint_swapped(p_rotation double precision)
returns boolean
language sql
immutable
as $$
  select ((round(coalesce(p_rotation, 0))::integer % 360 + 360) % 360) in (90, 270);
$$;


-- ----------------------------------------------------------------------------
-- 2. place_garden_object (gedrehter Footprint)
-- ----------------------------------------------------------------------------
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
  v_w              integer;
  v_h              integer;
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

  -- Footprint in der gewählten Drehung (90°/270°: Breite <-> Höhe).
  if public.garden_footprint_swapped(p_rotation) then
    v_w := v_item.footprint_height;
    v_h := v_item.footprint_width;
  else
    v_w := v_item.footprint_width;
    v_h := v_item.footprint_height;
  end if;

  -- Weltgrenzen: der gesamte Footprint (nicht nur die obere linke Ecke)
  -- muss innerhalb von 0..grid_width-1 x 0..grid_height-1 liegen.
  if p_grid_x < 0 or p_grid_y < 0
     or p_grid_x + v_w > v_world.grid_width
     or p_grid_y + v_h > v_world.grid_height then
    raise exception 'Placement is outside world grid bounds';
  end if;

  -- Serialisiert Platzierungen desselben Nutzers/derselben Welt innerhalb
  -- dieser Transaktion (siehe auch move_garden_object).
  perform pg_advisory_xact_lock(hashtextextended(v_profile_id::text || ':' || p_world_id::text, 0));

  -- Kollision (AABB) mit jedem platzierten Objekt desselben Nutzers in
  -- derselben Welt — beide Footprints in ihrer jeweiligen Drehung.
  if exists (
    select 1
    from public.garden_objects go
    join public.item_catalog ic on ic.id = go.item_id
    cross join lateral (
      select
        case when public.garden_footprint_swapped(go.rotation)
             then ic.footprint_height else ic.footprint_width end as w,
        case when public.garden_footprint_swapped(go.rotation)
             then ic.footprint_width else ic.footprint_height end as h
    ) fp
    where go.profile_id = v_profile_id
      and go.world_id = p_world_id
      and p_grid_x < go.grid_x + fp.w
      and p_grid_x + v_w > go.grid_x
      and p_grid_y < go.grid_y + fp.h
      and p_grid_y + v_h > go.grid_y
  ) then
    raise exception 'Grid cells already occupied';
  end if;

  v_path_shape := v_item.attributes ->> 'path_shape';

  if v_path_shape is not null then
    -- Wegstück: kein Inventar-Verbrauch -- die Berechtigung kommt aus dem
    -- einmalig gekauften Stil-Freischalt-Item (siehe sql/path-items.sql
    -- und sql/paths-unlimited-placement.sql).
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
    case when p_use_grown and v_path_shape is null then now() else null end
  )
  returning * into v_obj;

  return v_obj;
end;
$$;


-- ----------------------------------------------------------------------------
-- 3. move_garden_object
-- ----------------------------------------------------------------------------
create or replace function public.move_garden_object(
  p_garden_object_id uuid,
  p_grid_x integer,
  p_grid_y integer,
  p_pos_x double precision,
  p_pos_y double precision,
  p_rotation double precision
)
returns public.garden_objects
language plpgsql security definer
set search_path = public
as $$
declare
  v_profile_id  uuid := auth.uid();
  v_obj         public.garden_objects;
  v_item        public.item_catalog;
  v_world       public.worlds;
  v_w           integer;
  v_h           integer;
begin
  -- Besitzprüfung: nur eigene Objekte.
  select * into v_obj
  from public.garden_objects
  where id = p_garden_object_id and profile_id = v_profile_id;

  if not found then
    raise exception 'Garden object not found';
  end if;

  -- Gleiche Sperre wie place_garden_object, damit ein Move und ein
  -- gleichzeitiges Platzieren nicht beide dieselbe Zelle als frei sehen.
  perform pg_advisory_xact_lock(hashtextextended(v_profile_id::text || ':' || v_obj.world_id::text, 0));

  -- Nach der Sperre erneut lesen (könnte inzwischen entfernt worden sein).
  select * into v_obj
  from public.garden_objects
  where id = p_garden_object_id and profile_id = v_profile_id
  for update;

  if not found then
    raise exception 'Garden object not found';
  end if;

  select * into v_item from public.item_catalog where id = v_obj.item_id;
  select * into v_world from public.worlds where id = v_obj.world_id;

  if public.garden_footprint_swapped(p_rotation) then
    v_w := v_item.footprint_height;
    v_h := v_item.footprint_width;
  else
    v_w := v_item.footprint_width;
    v_h := v_item.footprint_height;
  end if;

  if p_grid_x < 0 or p_grid_y < 0
     or p_grid_x + v_w > v_world.grid_width
     or p_grid_y + v_h > v_world.grid_height then
    raise exception 'Placement is outside world grid bounds';
  end if;

  if exists (
    select 1
    from public.garden_objects go
    join public.item_catalog ic on ic.id = go.item_id
    cross join lateral (
      select
        case when public.garden_footprint_swapped(go.rotation)
             then ic.footprint_height else ic.footprint_width end as w,
        case when public.garden_footprint_swapped(go.rotation)
             then ic.footprint_width else ic.footprint_height end as h
    ) fp
    where go.profile_id = v_profile_id
      and go.world_id = v_obj.world_id
      and go.id <> v_obj.id
      and p_grid_x < go.grid_x + fp.w
      and p_grid_x + v_w > go.grid_x
      and p_grid_y < go.grid_y + fp.h
      and p_grid_y + v_h > go.grid_y
  ) then
    raise exception 'Grid cells already occupied';
  end if;

  -- planted_at / grown_at bleiben unangetastet -> Wachstum bleibt erhalten.
  update public.garden_objects
  set grid_x = p_grid_x,
      grid_y = p_grid_y,
      pos_x = p_pos_x,
      pos_y = p_pos_y,
      rotation = p_rotation
  where id = v_obj.id
  returning * into v_obj;

  return v_obj;
end;
$$;

revoke all on function public.move_garden_object(
  uuid, integer, integer, double precision, double precision, double precision
) from public, anon;
grant execute on function public.move_garden_object(
  uuid, integer, integer, double precision, double precision, double precision
) to authenticated;


-- ----------------------------------------------------------------------------
-- 4. protect_garden_object_fields: grid/rotation/scale nicht mehr direkt
-- ----------------------------------------------------------------------------
-- Clients dürfen per direktem UPDATE nur noch pos_x/pos_y ändern.
-- SECURITY-DEFINER-Funktionen (complete_study_session setzt grown_at,
-- move_garden_object setzt grid_x/grid_y) laufen als 'postgres' und sind
-- ausgenommen. Trigger trg_protect_garden_object_fields existiert bereits
-- und ruft diese Funktion auf.
create or replace function public.protect_garden_object_fields()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'postgres' then
    return new;
  end if;

  if new.profile_id <> old.profile_id
     or new.item_id <> old.item_id
     or new.world_id <> old.world_id
     or new.planted_at <> old.planted_at
     or new.grown_at is distinct from old.grown_at
     or new.grid_x <> old.grid_x
     or new.grid_y <> old.grid_y
     or new.rotation is distinct from old.rotation
     or new.scale is distinct from old.scale then
    raise exception 'Use move_garden_object() to move or rotate garden objects';
  end if;
  return new;
end;
$$;
