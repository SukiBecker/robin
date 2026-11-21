#!/bin/sh
# Erzeugt aus dem Supabase-Dev-Projekt neu:
#   supabase/migrations/<timestamp>_baseline.sql  (Schema "public", nur Struktur)
#   supabase/seed.sql                              (Katalog- und Balancing-Daten)
#
# Die Baseline ist die erste Migration: sie bildet den kompletten Stand ab.
# Weitere Schemaänderungen kommen als eigene Migration dazu
# (supabase migration new <name>), nicht als neue Baseline.
#
# DEV_DB_URL = Session-Pooler-Connection-String (Port 5432) aus dem
# Supabase-Dashboard -> Connect. Aufruf z.B.:
#   DEV_DB_URL='postgresql://...' npm run db:dump
#
# Läuft eine Baseline schon (supabase/migrations/*_baseline.sql), wird sie
# ersetzt. Das ist nur sinnvoll, solange sie noch nirgends angewendet wurde.
set -eu

if [ -z "${DEV_DB_URL:-}" ]; then
  echo "DEV_DB_URL is not set (Supabase dashboard -> Connect -> Session pooler)." >&2
  exit 1
fi

cd "$(dirname "$0")/.."
mkdir -p supabase/migrations

BASELINE="supabase/migrations/$(date -u +%Y%m%d%H%M%S)_baseline.sql"
rm -f supabase/migrations/*_baseline.sql

pg_dump "$DEV_DB_URL" --schema-only --schema=public --no-owner \
  -f "$BASELINE"

pg_dump "$DEV_DB_URL" --data-only --inserts --no-owner \
  -t public.achievements \
  -t public.app_config \
  -t public.worlds \
  -t public.item_catalog \
  -t public.level_thresholds \
  -t public.quests \
  -t public.sound_catalog \
  -f supabase/seed.sql

echo "Wrote $BASELINE and supabase/seed.sql. Review with: git status supabase/"
