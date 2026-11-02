"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RobinMascot } from "@/components/robin-mascot";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { XpIcon } from "@/components/xp-icon";
import { StreakIcon } from "@/components/streak-icon";
import { STREAK_SYNCED_EVENT } from "@/components/streak-sync";
import styles from "./home.module.css";


type ProfileSummary = {
  display_name: string;
  xp: number;
  coins: number;
  current_streak: number;
  level: number;
};

export default function HomePage() {
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // showLoading = false: quiet refetch after the streak sync, no flash.
    async function load(showLoading = true) {
      setError(null);
      if (showLoading) setLoading(true);

      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!cancelled) {
          setLoading(false);
          setError("You must be signed in to view this page.");
        }
        return;
      }

      const { data, error: profileError } = await supabase
        .from("profiles_with_level")
        .select("display_name, xp, coins, current_streak, level")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      setLoading(false);

      if (profileError) {
        setError(profileError.message);
        return;
      }

      setProfile(data);
    }

    load();
    const reload = () => load(false);
    window.addEventListener(STREAK_SYNCED_EVENT, reload);

    return () => {
      cancelled = true;
      window.removeEventListener(STREAK_SYNCED_EVENT, reload);
    };
  }, []);

  return (
    <div className={`${styles.page}`}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.glowSecondary} aria-hidden="true" />

      <div className={styles.shell}>
        {loading && <p className={styles.body}>Loading…</p>}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}

        {!loading && !error && profile && (
          <>
            <div className={styles.hero}>
              <div className={styles.heroRobin}>
                <div className={styles.heroRobinHalo} aria-hidden="true" />
                <RobinMascot size={140} />
              </div>

              <div className={styles.heroText}>
                <p className={styles.eyebrow}>{getGreeting()}</p>
                <h1 className={styles.heading}>Welcome back, {profile.display_name}.</h1>
                <p className={styles.tagline}>Robin&apos;s keeping an eye on the garden — ready to grow it a little more?</p>
              </div>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statTile}>
                <span className={styles.statLabel}>Level</span>
                <span className={styles.statValue} data-stat="level">
                  {profile.level}
                </span>
              </div>
              <div className={styles.statTile}>
                <span className={styles.statLabel}>Streak</span>
                <span className={styles.statValue} data-stat="streak">
                  <StreakIcon size={16} /> {profile.current_streak}
                </span>
              </div>
              <div className={styles.statTile}>
                <span className={styles.statLabel}>XP</span>
                <span className={styles.statValue} data-stat="xp">
                  <XpIcon size={16} /> {profile.xp}
                </span>
              </div>
              <div className={styles.statTile}>
                <span className={styles.statLabel}>Coins</span>
                <span className={styles.statValue} data-stat="coins">
                  <CoinIcon size={16} /> {profile.coins}
                </span>
              </div>
            </div>

            <div className={styles.ctaRow}>
              <Button href="/studyroom">Go to Studyroom</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
