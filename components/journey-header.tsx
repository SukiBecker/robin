import { StreakIcon } from "./streak-icon";
import { StudyTimeStat } from "./study-time-stat";
import styles from "./journey-header.module.css";

type JourneyHeaderProps = {
  streak: number;
  /** From profiles_with_level — never computed client-side. */
  level: number;
  todaySeconds: number;
  totalSeconds: number;
  streakMinMinutes: number;
  /** Streak sits on 7/30/100 and was reached today — the only gold moment. */
  milestone: boolean;
};

/** Statistics header: day streak as the hero, level and time studied
    beside it. A brand-new user (nothing studied yet) gets Robin and a
    welcome instead of a wall of zeros. */
export function JourneyHeader({
  streak,
  level,
  todaySeconds,
  totalSeconds,
  streakMinMinutes,
  milestone,
}: JourneyHeaderProps) {
  const isNewUser = streak === 0 && totalSeconds === 0;

  return (
    <section className={styles.panel} aria-label="Your study journey">
      {isNewUser && (
        <div className={styles.welcome}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mascot/robin-sitting.png" alt="" aria-hidden="true" className={styles.welcomeRobin} />
          <div className={styles.welcomeText}>
            <p className={styles.welcomeTitle}>Your journey starts with your first session.</p>
            <p className={styles.welcomeBody}>
              Study {streakMinMinutes} minutes today and your first streak day lights up.
            </p>
          </div>
        </div>
      )}

      <div className={styles.grid}>
        <div className={`${styles.streak} ${milestone ? styles.streakMilestone : ""}`}>
          {milestone && <span className={styles.milestoneBadge}>{streak}-day milestone!</span>}
          <StreakIcon size={64} className={`${styles.flame} ${streak === 0 ? styles.flameIdle : ""}`} />
          <div className={styles.streakText}>
            <span className={`${styles.streakValue} ${streak === 0 ? styles.valueEmpty : ""}`}>
              {streak}
            </span>
            <span className={styles.label}>Day streak</span>
          </div>
          {streak === 0 && !isNewUser && (
            <p className={styles.streakHint}>
              Study {streakMinMinutes} min today to start a fresh streak.
            </p>
          )}
        </div>

        <div className={styles.side}>
          <div className={styles.level}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/level-badge.png" alt="" aria-hidden="true" className={styles.levelBadge} />
            <div className={styles.levelText}>
              <span className={styles.label}>Level</span>
              <span className={styles.levelValue}>{level}</span>
            </div>
          </div>

          <div className={styles.divider} />

          <StudyTimeStat
            todaySeconds={todaySeconds}
            totalSeconds={totalSeconds}
            streakMinMinutes={streakMinMinutes}
            streak={streak}
          />
        </div>
      </div>
    </section>
  );
}
