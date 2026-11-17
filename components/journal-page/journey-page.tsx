"use client";

import { useEffect, useState } from "react";
import { LuggageTag } from "@/components/journal/luggage-tag";
import { XpSeedJar } from "@/components/journal/xp-seed-jar";
import { placeName, type Place } from "@/lib/journal/places";
import { getLevelProgress, getXpForLevel, type LevelProgress } from "@/lib/level-progress";
import { createClient } from "@/lib/supabase/client";
import styles from "./journey-page.module.css";

type JourneyPageProps = {
  /** profiles_with_level.xp */
  xp: number;
  /** profiles_with_level.level — never computed here. */
  level: number;
};

type NextStop = { place: Place; xpToGo: number } | "arrived";

/** The Journal's right page: the journey. The seed jar for the level,
    the luggage tag with the next place. */
export function JourneyPage({ xp, level }: JourneyPageProps) {
  const [progress, setProgress] = useState<LevelProgress | null>(null);
  const [nextStop, setNextStop] = useState<NextStop | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const [progressResult, worldsResult] = await Promise.all([
        getLevelProgress(xp, level).catch(() => null),
        supabase
          .from("worlds")
          .select("id, slug, name, unlock_level, sort_order")
          .order("unlock_level", { ascending: true }),
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
  }, [xp, level]);

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
    </section>
  );
}
