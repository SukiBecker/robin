import { createClient } from "@/lib/supabase/client";

/**
 * XP thresholds per level — read live from public.level_thresholds.
 *
 * The level itself is NEVER computed here (it always comes from
 * profiles_with_level, per the economy rules). This file only answers
 * "how much XP does level N start at", so the XP bar can show
 * "{current} / {next} XP" for the server-provided level.
 *
 * History: this used to be a hardcoded mirror of the table, first guessed
 * by probing get_level() (wrong), then copied from the level_thresholds
 * seed rows in bloomly-schema.sql — which then turned out to not match
 * what the live database actually returns either (get_level(15) = 2 and
 * get_level(410) = 10 live, vs. the schema seed's 25/642 XP for those
 * levels). Rather than keep guessing which source is "right" or re-sync a
 * copy by hand, this now reads public.level_thresholds directly — it's
 * public.level_thresholds (anon/authenticated SELECT is granted in the
 * schema's RLS section) — so it can never drift from whatever the server
 * actually uses again. If it does need to double as an RPC later (e.g. to
 * avoid the extra round trip), the computation below can move server-side
 * without changing this file's exported shape.
 */

type ThresholdRow = { level: number; xp_required: number };

// Module-level cache: level_thresholds is game-balance config, not
// per-user data, so one fetch for the page's lifetime is enough — no
// need to refetch on every nav-bar remount.
let thresholdsPromise: Promise<number[]> | null = null;

function loadThresholds(): Promise<number[]> {
  if (!thresholdsPromise) {
    thresholdsPromise = (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("level_thresholds")
        .select("level, xp_required")
        .order("level", { ascending: true });

      if (error || !data || data.length === 0) {
        // Let a later call retry instead of being stuck on one failed fetch.
        thresholdsPromise = null;
        throw error ?? new Error("level_thresholds returned no rows");
      }

      const table: number[] = [];
      for (const row of data as ThresholdRow[]) table[row.level] = row.xp_required;
      return table;
    })();
  }
  return thresholdsPromise;
}

/** Total XP at which `level` is reached (level 1 starts at 0). */
function xpForLevel(table: number[], level: number): number {
  if (level <= 1) return 0;
  if (table[level] !== undefined) return table[level];

  // Beyond the highest seeded level: extend using the step between the
  // last two seeded levels, so this keeps working whatever that step
  // currently is instead of hardcoding one.
  let lastSeeded = table.length - 1;
  while (lastSeeded > 1 && table[lastSeeded] === undefined) lastSeeded--;
  const step = lastSeeded >= 2 ? table[lastSeeded] - table[lastSeeded - 1] : 0;
  return table[lastSeeded] + step * (level - lastSeeded);
}

export type LevelProgress = {
  level: number;
  /** XP earned inside the current level. */
  current: number;
  /** XP needed to finish the current level. */
  next: number;
  /** 0–100 fill of the current level. */
  percent: number;
};

export async function getLevelProgress(xp: number, level: number): Promise<LevelProgress> {
  const table = await loadThresholds();
  const start = xpForLevel(table, level);
  const next = xpForLevel(table, level + 1) - start;
  const current = Math.min(Math.max(xp - start, 0), next);
  return { level, current, next, percent: next > 0 ? (current / next) * 100 : 100 };
}

/** Total XP at which `level` starts, from the live thresholds — e.g. how
    far away the level that opens the next place is. */
export async function getXpForLevel(level: number): Promise<number> {
  const table = await loadThresholds();
  return xpForLevel(table, level);
}

/** Fired on window whenever the user's XP changes (e.g. after a study
    session), so the always-visible nav bar can refetch. */
export const XP_CHANGED_EVENT = "bloomly:xp-changed";
