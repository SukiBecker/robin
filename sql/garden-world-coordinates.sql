-- ============================================================================
-- MIGRATION: garden-world-coordinates.sql   (DATA ONLY — no schema change)
-- ============================================================================
-- WAS:    1. Jede Welt mit 20x20-Raster bekommt ein 60x60-Raster.
--         2. Alle garden_objects dieser Welten werden um +20 Zellen
--            verschoben (grid_x/grid_y), sodass der bisherige Garten in der
--            Weltmitte liegt.
--         3. pos_x/pos_y werden von "Prozent des 20x20-Plots" (0-100) auf
--            WELTKOORDINATEN in Zellen umgerechnet (Kommazahl, 0-60):
--              pos = 20 + pos_alt / 100 * 20
--
-- WARUM:  Der Client (lib/garden/world.ts, components/garden-scene.tsx)
--         rendert ab jetzt nur noch Weltzellen — unabhängig von Viewport
--         und Zoom. Es gibt KEINEN Übergangsmodus: vor dieser Migration
--         stehen Objekte im neuen Client an falschen Stellen.
--
-- ABLAUF: 1. Backup (unten, Abschnitt A) auf Dev-Supabase
--         2. Dieses Skript auf Dev-Supabase ausführen
--         3. Verifikation (Abschnitt B) ausführen, Branch dev testen
--         4. Backup + Skript + Verifikation auf robin-prod
--         5. Erst danach dev -> main mergen
--
-- IDEMPOTENT: Alles ist auf grid_width = 20 AND grid_height = 20
--         eingeschränkt. Ein zweiter Lauf findet keine solche Welt mehr und
--         ändert nichts. (Eine eigene "migriert"-Markierung ginge nur per
--         Schema-Change; Prozent- und Zellwerte überlappen sich im
--         Wertebereich, sind also nicht am Wert unterscheidbar.)
--
-- Muss zu WORLD_COLS/WORLD_ROWS bzw. HOME_REGION in lib/garden/world.ts
-- passen (60x60, alter Garten = Zellen 20..40).
--
-- ----------------------------------------------------------------------------
-- A) BACKUP — VOR dem Lauf
-- ----------------------------------------------------------------------------
-- Variante 1, Supabase SQL Editor: beide Queries ausführen und das Ergebnis
-- jeweils über "Export -> CSV" sichern.
--
--   select * from public.worlds order by id;
--   select * from public.garden_objects order by world_id, profile_id, id;
--
-- Variante 2, psql (Connection-String aus Dashboard -> Connect):
--
--   \copy (select * from public.worlds order by id) to 'backup_worlds.csv' csv header
--   \copy (select * from public.garden_objects order by id) to 'backup_garden_objects.csv' csv header
--
-- Variante 3, pg_dump (stellt per psql direkt wieder her):
--
--   pg_dump "$DB_URL" --data-only --inserts --no-owner \
--     -t public.worlds -t public.garden_objects \
--     -f backup-garden-$(date +%Y%m%d-%H%M).sql
--
-- ----------------------------------------------------------------------------
-- B) VERIFIKATION — NACH dem Lauf
-- ----------------------------------------------------------------------------
-- Erwartet: grid_width/grid_height = 60 für alle Welten; bei Welten mit
-- Objekten liegen min/max von grid_x/grid_y und pos_x/pos_y zwischen 20
-- und 40 (der alte Garten in der Mitte); grid_x_end/grid_y_end <= 40.
--
--   select w.slug,
--          w.grid_width, w.grid_height,
--          count(go.id)                                  as objects,
--          min(go.grid_x)                                as grid_x_min,
--          max(go.grid_x + ic.footprint_width)           as grid_x_end,
--          min(go.grid_y)                                as grid_y_min,
--          max(go.grid_y + ic.footprint_height)          as grid_y_end,
--          round(min(go.pos_x)::numeric, 2)              as pos_x_min,
--          round(max(go.pos_x)::numeric, 2)              as pos_x_max,
--          round(min(go.pos_y)::numeric, 2)              as pos_y_min,
--          round(max(go.pos_y)::numeric, 2)              as pos_y_max
--   from public.worlds w
--   left join public.garden_objects go on go.world_id = w.id
--   left join public.item_catalog ic   on ic.id = go.item_id
--   group by w.id
--   order by w.sort_order;
--
-- Plausibilität: Objekte, deren pos_x/pos_y nicht innerhalb (oder auf dem
-- Rand) ihres eigenen Footprints liegen. Erwartet 0 Zeilen — Ausnahme:
-- Objekte, die vor der Grid-Migration mit freiem Jitter platziert wurden;
-- die stehen dann eben (wie bisher) leicht neben ihrer Zelle.
--
--   select go.id, ic.name, go.grid_x, go.grid_y, go.pos_x, go.pos_y
--   from public.garden_objects go
--   join public.item_catalog ic on ic.id = go.item_id
--   where go.pos_x < go.grid_x - 0.01
--      or go.pos_x > go.grid_x + ic.footprint_width + 0.01
--      or go.pos_y < go.grid_y - 0.01
--      or go.pos_y > go.grid_y + ic.footprint_height + 0.01;
-- ============================================================================

begin;

-- Objekte zuerst: die Bedingung auf grid_width = 20 greift nur, solange die
-- Welt noch nicht umgestellt ist (Update der Welt folgt direkt danach).
update public.garden_objects go
set grid_x     = go.grid_x + 20,
    grid_y     = go.grid_y + 20,
    pos_x      = 20 + go.pos_x / 100 * 20,
    pos_y      = 20 + go.pos_y / 100 * 20,
    updated_at = now()
from public.worlds w
where go.world_id = w.id
  and w.grid_width = 20
  and w.grid_height = 20;

update public.worlds
set grid_width  = 60,
    grid_height = 60
where grid_width = 20
  and grid_height = 20;

commit;
