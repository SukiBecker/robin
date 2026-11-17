-- ============================================================================
-- MIGRATION: journal-world-stamps.sql   (one view, no table change)
-- ============================================================================
-- WAS:    View v_world_stamps: pro Profil und Ort (worlds) der Zeitpunkt,
--         an dem der Ort erreicht wurde — für die Briefmarken im Journal
--         ("The Garden · est. Sep 2026", sonst "Not yet issued").
--           • Ort mit unlock_level <= 1 (The Garden): profiles.created_at.
--           • Spätere Orte: die erste reward_transaction, nach der die
--             kumulierten XP (Summe xp_delta, zeitlich sortiert) ein Level
--             >= unlock_level ergeben — gemessen mit get_level(), also mit
--             genau der Schwelle, die der Server auch sonst nutzt.
--           • Fallback, falls das Profil-Level den Ort schon erreicht hat,
--             die Transaktionen aber nicht hinkommen (z. B. XP aus der Zeit
--             vor reward_transactions): die letzte Transaktion des Profils,
--             sonst created_at. So zeigt ein erreichter Ort nie
--             "Not yet issued".
--           • Nicht erreicht: unlocked_at = NULL.
--
-- WARUM:  Entscheidung 2026-11-17 (robin-design §3, Journal): das Datum wird
--         abgeleitet, nichts wird zusätzlich gespeichert und kann so auch
--         nicht auseinanderlaufen.
--
-- SICHERHEIT: security_invoker wie bei den anderen Views -> es gelten die
--         RLS-Policies der Basistabellen (profiles_select_own,
--         reward_transactions_select_own, worlds_public_read). Jede:r sieht
--         nur die eigenen Zeilen.
--
-- REIHENFOLGE: Dev zuerst, dann robin-prod, dann dev -> main mergen.
-- In bloomly-schema.sql unter "NOCH EINZUPFLEGEN" vermerkt.
-- ============================================================================

create or replace view public.v_world_stamps
with (security_invoker = true) as
with running as (
  select
    rt.profile_id,
    rt.created_at,
    sum(rt.xp_delta) over (
      partition by rt.profile_id
      order by rt.created_at, rt.id
      rows between unbounded preceding and current row
    ) as xp_total
  from public.reward_transactions rt
)
select
  p.id as profile_id,
  w.id as world_id,
  w.unlock_level,
  case
    when w.unlock_level <= 1 then p.created_at
    else coalesce(
      (
        select min(r.created_at)
        from running r
        where r.profile_id = p.id
          and public.get_level(r.xp_total::integer) >= w.unlock_level
      ),
      case
        when public.get_level(p.xp) >= w.unlock_level then coalesce(
          (select max(rt.created_at) from public.reward_transactions rt where rt.profile_id = p.id),
          p.created_at
        )
      end
    )
  end as unlocked_at
from public.profiles p
cross join public.worlds w;

comment on view public.v_world_stamps is
  'Journal-Briefmarken: pro Profil und Ort der Zeitpunkt der Freischaltung (NULL = noch nicht erreicht). Abgeleitet aus profiles.created_at und reward_transactions, siehe sql/journal-world-stamps.sql.';

grant select on public.v_world_stamps to authenticated;

-- ---------------------------------------------------------------------------
-- TEST (im SQL-Editor; liest als postgres alle Profile, RLS greift dort nicht):
--   select p.display_name, s.world_id, s.unlock_level, s.unlocked_at,
--          public.get_level(p.xp) as level_now
--   from public.v_world_stamps s join public.profiles p on p.id = s.profile_id
--   order by p.display_name, s.unlock_level;
-- Erwartung: unlock_level 1 = created_at; Orte mit unlock_level <= level_now
-- haben ein Datum, alle anderen NULL.
-- ---------------------------------------------------------------------------
