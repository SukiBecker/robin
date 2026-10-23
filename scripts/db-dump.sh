#!/bin/sh
# Erzeugt db/dev-schema-dump.sql und db/dev-content-dump.sql aus dem
# Supabase-Dev-Projekt neu.
#
# DEV_DB_URL = Session-Pooler-Connection-String (Port 5432) aus dem
# Supabase-Dashboard -> Connect. Aufruf z.B.:
#   DEV_DB_URL='postgresql://...' npm run db:dump
set -eu

if [ -z "${DEV_DB_URL:-}" ]; then
  echo "DEV_DB_URL is not set (Supabase dashboard -> Connect -> Session pooler)." >&2
  exit 1
fi

cd "$(dirname "$0")/.."

pg_dump "$DEV_DB_URL" --schema-only --schema=public --no-owner \
  -f db/dev-schema-dump.sql

pg_dump "$DEV_DB_URL" --data-only --inserts --no-owner \
  -t public.achievements \
  -t public.app_config \
  -t public.worlds \
  -t public.item_catalog \
  -t public.level_thresholds \
  -t public.quests \
  -t public.sound_catalog \
  -f db/dev-content-dump.sql

echo "Dumps written to db/. Review with: git diff db/"
