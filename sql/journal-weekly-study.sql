-- ============================================================================
-- MIGRATION: journal-weekly-study.sql   (one view, no table change)
-- ============================================================================
-- WAS:    View v_weekly_study: pro Profil und Woche die Lernzeit und die
--         Pflanzenart, die in dieser Woche am meisten gewachsen ist — für die
--         Wochen-Stempel im Journal (Lernzeit + Pflanzenmotiv).
--           • week_start: Montag der Woche in der Zeitzone des Profils
--             (date_trunc('week', …) beginnt in Postgres am Montag), genau
--             wie v_daily_activity die Tage in profiles.timezone schneidet.
--           • total_seconds: Summe duration_seconds der abgeschlossenen
--             Sessions der Woche.
--           • top_item_id: Näherung (Entscheidung 2026-11-17). Eine Session
--             zählt für jedes wachsende Objekt des Profils, das zu ihrem
--             Start gepflanzt und noch nicht ausgewachsen war
--             (planted_at <= started_at < grown_at bzw. grown_at IS NULL;
--             gleiche Regel wie garden_object_growth_seconds). Die Zeit wird
--             PRO item_id summiert (alle Objekte derselben Art zusammen); die
--             Art mit der größten Summe gewinnt, bei Gleichstand die kleinere
--             item_id (stabil). Nur wachsende Items
--             (growth_duration_seconds IS NOT NULL).
--           • Ohne Wachstum in der Woche: top_item_id = NULL -> das Journal
--             zeigt den Samen als neutrales Motiv.
--           • Wochen ohne abgeschlossene Session fehlen (das Journal füllt
--             sie mit 0 auf).
--
-- GRENZE: Entfernte Objekte (DELETE aus garden_objects) zählen rückwirkend
--         nicht mehr mit — für ein Motiv reicht die Näherung.
--
-- SICHERHEIT: security_invoker wie bei den anderen Views -> es gelten die
--         RLS-Policies der Basistabellen (study_sessions, profiles,
--         garden_objects: nur eigene Zeilen; item_catalog: aktive Items).
--
-- REIHENFOLGE: Dev zuerst, dann robin-prod, dann dev -> main mergen.
-- In bloomly-schema.sql unter "NOCH EINZUPFLEGEN" vermerkt.
-- ============================================================================

create or replace view public.v_weekly_study
with (security_invoker = true) as
with sessions as (
  select
    s.profile_id,
    s.started_at,
    s.duration_seconds,
    date_trunc('week', s.started_at at time zone p.timezone)::date as week_start
  from public.study_sessions s
  join public.profiles p on p.id = s.profile_id
  where s.completed = true
    and coalesce(s.duration_seconds, 0) > 0
),
weeks as (
  select profile_id, week_start, sum(duration_seconds)::bigint as total_seconds
  from sessions
  group by profile_id, week_start
),
growth as (
  select se.profile_id, se.week_start, g.item_id, sum(se.duration_seconds) as grown_seconds
  from sessions se
  join public.garden_objects g
    on g.profile_id = se.profile_id
   and g.planted_at <= se.started_at
   and (g.grown_at is null or se.started_at < g.grown_at)
  join public.item_catalog ic
    on ic.id = g.item_id
   and ic.growth_duration_seconds is not null
  group by se.profile_id, se.week_start, g.item_id
),
top_item as (
  select distinct on (profile_id, week_start) profile_id, week_start, item_id
  from growth
  order by profile_id, week_start, grown_seconds desc, item_id
)
select w.profile_id, w.week_start, w.total_seconds, t.item_id as top_item_id
from weeks w
left join top_item t using (profile_id, week_start);

comment on view public.v_weekly_study is
  'Journal-Wochen-Stempel: Lernzeit pro Woche (Montag, Profil-Zeitzone) und die meistgewachsene Pflanzenart (pro item_id summiert, NULL = kein Wachstum). Siehe sql/journal-weekly-study.sql.';

grant select on public.v_weekly_study to authenticated;

-- ---------------------------------------------------------------------------
-- TEST (im SQL-Editor als postgres, RLS greift dort nicht):
--   select p.display_name, w.week_start, w.total_seconds / 60 as minutes,
--          ic.name as top_plant
--   from public.v_weekly_study w
--   join public.profiles p on p.id = w.profile_id
--   left join public.item_catalog ic on ic.id = w.top_item_id
--   order by p.display_name, w.week_start desc
--   limit 20;
-- Gegenprobe Lernzeit: Summe total_duration_seconds aus v_daily_activity
-- über die 7 Tage ab week_start muss total_seconds ergeben.
-- ---------------------------------------------------------------------------
