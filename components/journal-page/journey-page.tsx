"use client";

import { useEffect, useState } from "react";
import { LuggageTag } from "@/components/journal/luggage-tag";
import { PostageStamp } from "@/components/journal/postage-stamp";
import { Stamp } from "@/components/journal/stamp";
import { XpSeedJar } from "@/components/journal/xp-seed-jar";
import { getItemIllustration } from "@/lib/garden/item-visuals";
import { placeMotif, placeName, type Place } from "@/lib/journal/places";
import { formatWeekStart, isoWeek, lastWeekStarts } from "@/lib/journal/weeks";
import { formatStudyTime } from "@/lib/statistics/format";
import { TabularNumber } from "@/components/journal/tabular-number";
import {
  getLevelProgress,
  getXpForLevel,
  type LevelProgress,
} from "@/lib/level-progress";
import { createClient } from "@/lib/supabase/client";
import styles from "./journey-page.module.css";

type JourneyPageProps = {
  userId: string;
  /** A brand-new user: jar, next stop and stamps stay, the weekly stamps
      (statistics) are left out — there is nothing to count yet. */
  empty?: boolean;
  /** YYYY-MM-DD in the profile timezone. */
  today: string;
  /** profiles_with_level.xp */
  xp: number;
  /** profiles_with_level.level — never computed here. */
  level: number;
};

type NextStop = { place: Place; xpToGo: number } | "arrived";
type PlaceStamp = Place & { unlockedAt: string | null };
type WeekStamp = {
  weekStart: string;
  seconds: number;
  plantName: string | null;
};

const WEEKS_SHOWN = 4;

const STAMP_INKS = ["green", "rust", "blue"] as const;

/** The Journal's right page: the journey. The seed jar for the level,
    the luggage tag with the next place, one postage stamp per place and
    a postmark for each of the last four weeks (study time + the plant
    that grew most that week, the seed when nothing grew). */
export function JourneyPage({
  userId,
  today,
  xp,
  level,
  empty = false,
}: JourneyPageProps) {
  const [progress, setProgress] = useState<LevelProgress | null>(null);
  const [nextStop, setNextStop] = useState<NextStop | null>(null);
  const [stamps, setStamps] = useState<PlaceStamp[] | null>(null);
  const [weeks, setWeeks] = useState<WeekStamp[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const [progressResult, worldsResult, stampsResult] = await Promise.all([
        getLevelProgress(xp, level).catch(() => null),
        supabase
          .from("worlds")
          .select("id, slug, name, unlock_level, sort_order")
          .order("unlock_level", { ascending: true }),
        supabase
          .from("v_world_stamps")
          .select("world_id, unlocked_at")
          .eq("profile_id", userId),
      ]);
      if (cancelled) return;
      setProgress(progressResult);

      if (worldsResult.error) return;
      const places: Place[] = (worldsResult.data ?? []).map((w) => ({
        id: w.id,
        slug: w.slug,
        name: placeName(w.slug, w.name),
        unlockLevel: w.unlock_level,
      }));

      // Without the view (not migrated yet) the stamp row stays away
      // rather than showing every place as "Not yet issued".
      if (!stampsResult.error) {
        const unlocked = new Map(
          (stampsResult.data ?? []).map((row) => [
            row.world_id as number,
            row.unlocked_at as string | null,
          ])
        );
        setStamps(
          places.map((p) => ({ ...p, unlockedAt: unlocked.get(p.id) ?? null }))
        );
      }

      const next = places.find((p) => p.unlockLevel > level);
      if (!next) {
        setNextStop("arrived");
        return;
      }
      const threshold = await getXpForLevel(next.unlockLevel).catch(() => null);
      if (cancelled || threshold === null) return;
      setNextStop({ place: next, xpToGo: Math.max(threshold - xp, 0) });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId, xp, level]);

  useEffect(() => {
    let cancelled = false;
    const starts = lastWeekStarts(today, WEEKS_SHOWN);

    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("v_weekly_study")
        .select("week_start, total_seconds, top_item_id")
        .eq("profile_id", userId)
        .gte("week_start", starts[starts.length - 1]);
      // Without the view (not migrated yet) the weekly stamps stay away.
      if (cancelled || error) return;

      const ids = [
        ...new Set((data ?? []).map((row) => row.top_item_id).filter(Boolean)),
      ] as string[];
      const names = new Map<string, string>();
      if (ids.length > 0) {
        const items = await supabase
          .from("item_catalog")
          .select("id, name")
          .in("id", ids);
        for (const item of items.data ?? []) names.set(item.id, item.name);
      }
      if (cancelled) return;

      const byWeek = new Map(
        (data ?? []).map((row) => [row.week_start as string, row])
      );
      setWeeks(
        // Oldest first, so the row reads like a journal: left to right.
        [...starts].reverse().map((weekStart) => {
          const row = byWeek.get(weekStart);
          return {
            weekStart,
            seconds: Number(row?.total_seconds ?? 0),
            plantName: row?.top_item_id
              ? (names.get(row.top_item_id) ?? null)
              : null,
          };
        })
      );
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId, today]);

  return (
    <JourneyCollage
      progress={progress}
      level={level}
      nextStop={nextStop}
      stamps={stamps}
      weeks={weeks}
      empty={empty}
    />
  );
}

type JourneyCollageProps = {
  /** null while loading (or if the thresholds failed). */
  progress: Pick<LevelProgress, "current" | "next"> | null;
  level: number;
  nextStop: NextStop | null;
  /** Every place with its unlock date (null = not reached); null = no
      v_world_stamps (the album stays away). */
  stamps: PlaceStamp[] | null;
  weeks: WeekStamp[] | null;
  /** Brand-new user: a bare jar, the first stamp larger with a "Welcome"
      postmark, no weekly postmarks. */
  empty?: boolean;
};

/** The right page itself, without data loading — JourneyPage feeds it,
    and /dev/components renders the same component with mock data. */
export function JourneyCollage({
  progress,
  level,
  nextStop,
  stamps,
  weeks,
  empty = false,
}: JourneyCollageProps) {
  // Reached places, then only the next one as a pencil outline; later
  // places stay out of the album.
  const album = stamps
    ? (() => {
        const reached = stamps.filter((p) => p.unlockedAt);
        const next = stamps.find((p) => !p.unlockedAt);
        return next ? [...reached, next] : reached;
      })()
    : null;

  return (
    <section className={styles.journey} aria-labelledby="journey-heading">
      {/* No visible page titles (robin-design §3); the headings stay for
          screen readers and the document outline. */}
      <h2 id="journey-heading" className={styles.srOnly}>
        The journey
      </h2>

      {/* Jar and tag belong together: the tag's string runs to the jar. */}
      <div className={styles.travel}>
        {progress && (
          <XpSeedJar
            className={styles.jar}
            value={progress.current}
            max={progress.next}
            level={level}
            // Empty state: a bare jar, no numbers yet.
            showLevel={!empty}
            caption={
              empty ? null : (
                <>
                  <TabularNumber>
                    {Math.max(progress.next - progress.current, 0)}
                  </TabularNumber>{" "}
                  XP to Level {level + 1}
                </>
              )
            }
          />
        )}
        {nextStop === "arrived" && (
          <LuggageTag
            className={styles.tag}
            arrived
            destination="All places reached"
          />
        )}
        {nextStop && nextStop !== "arrived" && (
          <LuggageTag
            className={styles.tag}
            destination={nextStop.place.name}
            unlockLevel={nextStop.place.unlockLevel}
            xpToGo={nextStop.xpToGo}
          />
        )}
      </div>

      {/* The album: stamps stuck in a row, the weekly postmarks pressed
          over their lower edge. A collage, so small alternating tilts
          (≤ ±2°) are allowed here (robin-design §4). */}
      {album && album.length > 0 && (
        <div className={styles.album}>
          <h3 className={styles.srOnly}>Places</h3>
          <ul className={styles.stamps}>
            {album.map((place, index) => (
              <li
                key={place.id}
                className={empty && index === 0 ? styles.firstStamp : undefined}
              >
                <PostageStamp
                  place={place.name}
                  unlockLevel={place.unlockLevel}
                  establishedAt={place.unlockedAt}
                  motif={placeMotif(place.slug)}
                  color={STAMP_INKS[index % STAMP_INKS.length]}
                  tilt={
                    place.unlockedAt
                      ? STAMP_TILTS[index % STAMP_TILTS.length]
                      : 0
                  }
                />
                {/* The very first page: the first place gets a welcome
                    postmark pressed over its corner. */}
                {empty && index === 0 && place.unlockedAt && (
                  <Stamp
                    className={styles.welcome}
                    top={place.name}
                    center="Welcome"
                    bottom={formatStampDate(place.unlockedAt)}
                    color="rust"
                    size="sm"
                    rotate={-2}
                  />
                )}
              </li>
            ))}
          </ul>

          {weeks && !empty && (
            <>
              <h3 className={styles.srOnly}>Last four weeks</h3>
              <ul className={styles.postmarks}>
                {weeks.map((week, index) => (
                  <li key={week.weekStart} className={styles.postmarkSlot}>
                    {/* A week without study gets no postmark: an empty
                        place in the row, nothing to count. */}
                    {week.seconds > 0 && (
                      <WeekPostmark
                        week={week}
                        rotate={POSTMARK_TILTS[index % POSTMARK_TILTS.length]}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}

const dayMonthYear = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** "Nov 17" for the welcome postmark's lower ring. */
function formatStampDate(iso: string): string {
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? dayMonthYear.format(date) : "";
}

/* Collage tilts: small, alternating (robin-design §4, album exception). */
const STAMP_TILTS = [1.5, -1, 2, -1.5] as const;
const POSTMARK_TILTS = [-2, 1.5, -1, 2] as const;

/** One week as a postmark of the current garden: week number on the
    ring, the Monday below, the study time in the middle and the plant
    that grew most as the motif — the seed when nothing grew. */
function WeekPostmark({ week, rotate }: { week: WeekStamp; rotate: number }) {
  const plant = week.plantName
    ? getItemIllustration(week.plantName, "grown")
    : null;
  const time = formatStudyTime(week.seconds, "today");
  return (
    <Stamp
      top={`Week ${isoWeek(week.weekStart)}`}
      bottom={formatWeekStart(week.weekStart)}
      center={time}
      plant={plant ?? "/ui/seed.webp"}
      plantName={plant ? (week.plantName ?? "Plant") : "Seed"}
      plantPrint={plant ? "lines" : "silhouette"}
      size="sm"
      rotate={rotate}
      aria-label={`Week ${isoWeek(week.weekStart)}, from ${formatWeekStart(week.weekStart)}: ${time} studied, ${
        plant ? `${week.plantName} grew most` : "nothing grew"
      }`}
    />
  );
}
