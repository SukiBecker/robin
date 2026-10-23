-- =====================================================================
-- Weg-Items: Weg-Stile (kaufbar) + Wegstücke (platzierbar)
-- =====================================================================
-- Rekonstruiert aus dem Dev-Stand (db/dev-content-dump.sql, 18.10.2026),
-- ersetzt die nicht mehr vorhandene bloomly_path_items_migration.sql.
--
-- Modell:
--   * Weg-Stil  (category = 'path_style'): wird einmal im Shop gekauft,
--     ist selbst nicht platzierbar.
--   * Wegstück  (category = 'decoration', attributes.path_shape gesetzt):
--     kostenlos, nicht im Shop, unbegrenzt platzierbar, sobald der Stil
--     aus attributes.path_style_item_id im Inventar liegt.
--
-- Idempotent: Items werden über (name, category) gefunden. Fehlende Items
-- werden mit den Dev-UUIDs angelegt, vorhandene auf den Dev-Stand
-- gebracht. attributes wird gemerged (||), nicht überschrieben, damit
-- spätere Einträge wie "unlimited_placement" einen erneuten Lauf
-- überleben. path_style_item_id wird immer aus der tatsächlichen ID des
-- Stils in DIESER Datenbank gesetzt, nicht aus der Dev-UUID.
--
-- Reihenfolge in Prod: zuerst diese Datei, danach
-- sql/paths-unlimited-placement.sql.
--
-- Das Ergebnis-Grid am Ende zeigt, wie viele Stile/Wegstücke gefunden
-- (schon vorhanden) bzw. neu angelegt wurden. Stimmt die Endzahl nicht
-- (2 Stile, 6 Wegstücke), bricht das Skript mit einem Fehler ab.
-- =====================================================================

-- Voraussetzung: Enum-Wert 'path_style'. Er kann nicht in derselben
-- Transaktion angelegt UND benutzt werden, deshalb hier nur prüfen.
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'item_category'
      and e.enumlabel = 'path_style'
  ) then
    raise exception 'Enum value public.item_category.path_style is missing. Run this statement on its own first, then re-run this script: alter type public.item_category add value ''path_style'';';
  end if;
end;
$$;

drop table if exists pg_temp.path_items_report;
create temp table path_items_report (
  kind     text primary key,
  found    integer not null,
  inserted integer not null,
  total    integer not null
);

do $$
declare
  v_style     record;
  v_tile      record;
  v_style_id  uuid;
  v_dupes     integer;
  v_found     integer;
  v_inserted  integer;
  v_total     integer;
begin
  -- -------------------------------------------------------------------
  -- 1. Weg-Stile
  -- -------------------------------------------------------------------
  v_found := 0;
  v_inserted := 0;

  for v_style in
    select * from (values
      ('62d401c4-efe9-4c81-8306-4bb015442b15'::uuid, 'Naturstein', 300, 1),
      ('f3febb68-83d1-4ffe-a9f7-f81105adad10'::uuid, 'Steinweg',   400, 5)
    ) as s(id, name, price, unlock_level)
  loop
    select count(*) into v_dupes
    from public.item_catalog
    where name = v_style.name and category = 'path_style';

    if v_dupes > 1 then
      raise exception 'Path style "%" exists % times in item_catalog, resolve duplicates first', v_style.name, v_dupes;
    end if;

    update public.item_catalog
    set price           = v_style.price,
        unlock_level    = v_style.unlock_level,
        world_id        = null,
        stackable       = false,
        consumable      = false,
        placeable       = false,
        growth_duration_seconds = null,
        image_asset_url = null,
        attributes      = attributes || '{"effect": "path_style_unlock"}'::jsonb,
        active          = true,
        footprint_width = 1,
        footprint_height = 1,
        updated_at      = now()
    where name = v_style.name and category = 'path_style';

    if found then
      v_found := v_found + 1;
    else
      insert into public.item_catalog (
        id, name, category, price, unlock_level, world_id, stackable, consumable,
        placeable, growth_duration_seconds, image_asset_url, attributes, active,
        footprint_width, footprint_height
      ) values (
        v_style.id, v_style.name, 'path_style', v_style.price, v_style.unlock_level, null, false, false,
        false, null, null, '{"effect": "path_style_unlock"}'::jsonb, true,
        1, 1
      );
      v_inserted := v_inserted + 1;
    end if;
  end loop;

  select count(*) into v_total
  from public.item_catalog
  where category = 'path_style' and name in ('Naturstein', 'Steinweg');

  insert into path_items_report values ('path_style', v_found, v_inserted, v_total);

  if v_total <> 2 then
    raise exception 'Expected 2 path styles after run, found %', v_total;
  end if;

  -- -------------------------------------------------------------------
  -- 2. Wegstücke
  -- -------------------------------------------------------------------
  v_found := 0;
  v_inserted := 0;

  for v_tile in
    select * from (values
      ('9564c4da-dd44-4e08-bea6-0981abbc4ea4'::uuid, 'Weg (Gerade)',      'Naturstein', 1, '/garden/items/path-straight.png',       'stone',     'straight'),
      ('2f90337d-a7b5-4bb8-a3cc-620993dae166'::uuid, 'Weg (Kurve)',       'Naturstein', 1, '/garden/items/path-curve.png',          'stone',     'curve'),
      ('7e620f57-a21c-4f42-a8ed-d289be5779b1'::uuid, 'Weg (Ende)',        'Naturstein', 1, '/garden/items/path-end.png',            'stone',     'end'),
      ('b87a3ed7-8323-4b27-8e67-571125d4e504'::uuid, 'Steinweg (Gerade)', 'Steinweg',   5, '/garden/items/path-straight-stone.png', 'flagstone', 'straight'),
      ('d28dc2b8-ab38-4dfb-bcc0-5b61cf0d4711'::uuid, 'Steinweg (Kurve)',  'Steinweg',   5, '/garden/items/path-curve-stone.png',    'flagstone', 'curve'),
      ('ee48d00b-5771-4d46-aba3-36894e1567ce'::uuid, 'Steinweg (Ende)',   'Steinweg',   5, '/garden/items/path-end-stone.png',      'flagstone', 'end')
    ) as t(id, name, style_name, unlock_level, image_asset_url, style, path_shape)
  loop
    select id into v_style_id
    from public.item_catalog
    where name = v_tile.style_name and category = 'path_style';

    select count(*) into v_dupes
    from public.item_catalog
    where name = v_tile.name and category = 'decoration';

    if v_dupes > 1 then
      raise exception 'Path item "%" exists % times in item_catalog, resolve duplicates first', v_tile.name, v_dupes;
    end if;

    update public.item_catalog
    set price           = 0,
        unlock_level    = v_tile.unlock_level,
        world_id        = null,
        stackable       = true,
        consumable      = false,
        placeable       = true,
        growth_duration_seconds = null,
        image_asset_url = v_tile.image_asset_url,
        attributes      = attributes || jsonb_build_object(
                            'style',              v_tile.style,
                            'path_shape',         v_tile.path_shape,
                            'path_family',        'garden_path',
                            'path_style_item_id', v_style_id
                          ),
        active          = true,
        footprint_width = 1,
        footprint_height = 1,
        updated_at      = now()
    where name = v_tile.name and category = 'decoration';

    if found then
      v_found := v_found + 1;
    else
      insert into public.item_catalog (
        id, name, category, price, unlock_level, world_id, stackable, consumable,
        placeable, growth_duration_seconds, image_asset_url, attributes, active,
        footprint_width, footprint_height
      ) values (
        v_tile.id, v_tile.name, 'decoration', 0, v_tile.unlock_level, null, true, false,
        true, null, v_tile.image_asset_url,
        jsonb_build_object(
          'style',              v_tile.style,
          'path_shape',         v_tile.path_shape,
          'path_family',        'garden_path',
          'path_style_item_id', v_style_id
        ),
        true, 1, 1
      );
      v_inserted := v_inserted + 1;
    end if;
  end loop;

  select count(*) into v_total
  from public.item_catalog ic
  join public.item_catalog st
    on st.id = (ic.attributes ->> 'path_style_item_id')::uuid
   and st.category = 'path_style'
  where ic.category = 'decoration'
    and ic.attributes ? 'path_shape'
    and ic.name in ('Weg (Gerade)', 'Weg (Kurve)', 'Weg (Ende)',
                    'Steinweg (Gerade)', 'Steinweg (Kurve)', 'Steinweg (Ende)');

  insert into path_items_report values ('path_tile', v_found, v_inserted, v_total);

  if v_total <> 6 then
    raise exception 'Expected 6 path items linked to a path style after run, found %', v_total;
  end if;
end;
$$;

select kind, found, inserted, total
from path_items_report
order by kind;
