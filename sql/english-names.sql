-- =====================================================================
-- Englische Namen: worlds.name + item_catalog.name (Konzept Phase 0)
-- =====================================================================
-- Stellt die noch deutschen Anzeigenamen auf Englisch um (die UI ist
-- komplett englisch, robin-design §10). NUR name wird geändert:
-- Slugs, IDs, Preise, attributes, Bild-URLs bleiben unberührt.
--
-- Betrifft (Stand Dev-Dump 23.10.2026):
--   worlds:        Garten -> Garden, Berge -> Mountains
--   item_catalog:  2 Weg-Stile + 6 Wegstücke (siehe Liste unten)
--
-- Reihenfolge-Hinweis:
--   * Muss NACH path-items.sql laufen. path-items.sql sucht Weg-Items
--     per Namen ('Naturstein', 'Weg (Gerade)' …) und würde nach dem
--     Umbenennen Duplikate anlegen -> nie erneut ausführen, wenn dieses
--     Skript schon gelaufen ist.
--   * Code-Gegenstück: lib/garden/item-visuals.ts und
--     components/path-picker.tsx kennen alte UND neue Namen (die alten
--     können nach dem Prod-Lauf entfernt werden).
--
-- Idempotent: ersetzt nur, wo der alte Name noch steht (Match per ID
-- bzw. Slug + alter Name). Zweiter Lauf = 0 Zeilen.
-- Ausführen: Supabase SQL Editor, erst Dev, dann Prod vor dem Merge
-- dev -> main.
--
-- Vorher prüfen, ob es weitere deutsche Namen gibt (Dump kann veraltet sein):
--   select id, name, slug from public.worlds order by id;
--   select id, name, category from public.item_catalog order by category, name;
-- Rückgängig: Skript mit vertauschten Namen laufen lassen.
-- =====================================================================

begin;

update public.worlds w
   set name = v.new_name
  from (values
    ('garden',    'Garten', 'Garden'),
    ('mountains', 'Berge',  'Mountains')
  ) as v(slug, old_name, new_name)
 where w.slug = v.slug
   and w.name = v.old_name;

update public.item_catalog ic
   set name = v.new_name,
       updated_at = now()
  from (values
    ('62d401c4-efe9-4c81-8306-4bb015442b15'::uuid, 'Naturstein',        'Natural Stone'),
    ('f3febb68-83d1-4ffe-a9f7-f81105adad10'::uuid, 'Steinweg',          'Cobblestone'),
    ('9564c4da-dd44-4e08-bea6-0981abbc4ea4'::uuid, 'Weg (Gerade)',      'Natural Stone Path (Straight)'),
    ('2f90337d-a7b5-4bb8-a3cc-620993dae166'::uuid, 'Weg (Kurve)',       'Natural Stone Path (Curve)'),
    ('7e620f57-a21c-4f42-a8ed-d289be5779b1'::uuid, 'Weg (Ende)',        'Natural Stone Path (End)'),
    ('b87a3ed7-8323-4b27-8e67-571125d4e504'::uuid, 'Steinweg (Gerade)', 'Cobblestone Path (Straight)'),
    ('d28dc2b8-ab38-4dfb-bcc0-5b61cf0d4711'::uuid, 'Steinweg (Kurve)',  'Cobblestone Path (Curve)'),
    ('ee48d00b-5771-4d46-aba3-36894e1567ce'::uuid, 'Steinweg (Ende)',   'Cobblestone Path (End)')
  ) as v(id, old_name, new_name)
 where ic.id = v.id
   and ic.name = v.old_name;

commit;

-- Kontrolle (erwartet: Garden/Beach/Mountains und nur englische Item-Namen):
--   select id, name, slug from public.worlds order by id;
--   select name, category from public.item_catalog
--    where category in ('path_style') or attributes ? 'path_shape' order by name;
