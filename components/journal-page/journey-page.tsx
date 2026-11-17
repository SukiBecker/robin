"use client";

import { useEffect, useState } from "react";
import { LuggageTag } from "@/components/journal/luggage-tag";
import { PostageStamp } from "@/components/journal/postage-stamp";
import { XpSeedJar } from "@/components/journal/xp-seed-jar";
import { placeMotif, placeName, type Place } from "@/lib/journal/places";
import { getLevelProgress, getXpForLevel, type LevelProgress } from "@/lib/level-progress";
import { createClient } from "@/lib/supabase/client";
import styles from "./journey-page.module.css";

type JourneyPageProps = {
  userId: string;
  /** profiles_with_level.xp */
  xp: number;
  /** profiles_with_level.level — never computed here. */
  level: number;
};

type NextStop = { place: Place; xpToGo: number } | "arrived";
type PlaceStamp = Place & { unlockedAt: string | null };

const STAMP_INKS = ["green", "rust", "blue"] as const;

/** The Journal's right page: the journey. The seed jar for the level,
    the luggage tag with the next place, one postage stamp per place. */
export function JourneyPage({ userId, xp, level }: JourneyPageProps) {
  const [progress, setProgress] = useState<LevelProgress | null>(null);
  const [nextStop, setNextStop] = useState<NextStop | null>(null);
  const [stamps, setStamps] = useState<PlaceStamp[] | null>(null);

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
        supabase.from("v_world_stamps").select("world_id, unlocked_at").eq("profile_id", userId),
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
          (stampsResult.data ?? []).map((row) => [row.world_id as number, row.unlocked_at as string | null])
        );
        setStamps(places.map((p) => ({ ...p, unlockedAt: unlocked.get(p.id) ?? null })));
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

  return (
    <section className={styles.journey} aria-labelledby="journey-heading">
      <h2 id="journey-heading" className={styles.title}>
        The journey
      </h2>

      <div className={styles.progressRow}>
        {progress && <XpSeedJar value={progress.current} max={progress.next} level={level} />}
        {nextStop === "arrived" && <LuggageTag arrived destination="All places reached" />}
        {nextStop && nextStop !== "arrived" && (
          <LuggageTag
            destination={nextStop.place.name}
            unlockLevel={nextStop.place.unlockLevel}
            xpToGo={nextStop.xpToGo}
          />
        )}
      </div>

      {stamps && stamps.length > 0 && (
        <section className={styles.section} aria-labelledby="journey-places-heading">
          <h3 id="journey-places-heading" className={styles.subtitle}>
            Places
          </h3>
          {/* Stamps stand straight: the tag above is this page's one
              tilted piece (robin-design §4). */}
          <ul className={styles.row}>
            {stamps.map((place, index) => (
              <li key={place.id}>
                <PostageStamp
                  place={place.name}
                  unlockLevel={place.unlockLevel}
                  establishedAt={place.unlockedAt}
                  motif={placeMotif(place.slug)}
                  color={STAMP_INKS[index % STAMP_INKS.length]}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
