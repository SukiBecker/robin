import { GameIcon } from "@/components/journal/game-icon";
import { InkRule } from "@/components/journal/ink";
import { Label } from "@/components/journal/label";
import { TabularNumber } from "@/components/journal/tabular-number";
import { formatStudyTime } from "@/lib/statistics/format";
import styles from "./journey-summary.module.css";

type JourneySummaryProps = {
  streak: number;
  todaySeconds: number;
  totalSeconds: number;
  /** app_config.streak_min_minutes_per_day */
  streakMinMinutes: number;
  /** Streak sits on 7/30/100 and was reached today — the one gold moment. */
  milestone: boolean;
};

/** Top of the Journal's left page: the streak as a label stuck in with
    tape (the sun, the number, "day streak") — the strongest thing on the
    page — then, one step smaller, the time studied —
    Today in stamp-green, Total in ink, each with a hand-drawn underline
    in its own colour (robin-design §3, Journal). Replaces JourneyHeader
    and StudyTimeStat. One hint sentence below, never two. */
export function JourneySummary({
  streak,
  todaySeconds,
  totalSeconds,
  streakMinMinutes,
  milestone,
}: JourneySummaryProps) {
  return (
    <section className={styles.summary} aria-labelledby="journey-summary-heading">
      <h2 id="journey-summary-heading" className={styles.srOnly}>
        Streak and time studied
      </h2>

      <div className={styles.streakSlot}>
        <Label as="div" tilt={-1.5} className={styles.streak}>
          <span className={styles.tape} aria-hidden="true" />
          <span className={styles.streakInner}>
            <GameIcon name="streak" size={48} className={streak === 0 ? styles.sunIdle : undefined} />
            <span className={styles.streakText}>
              <TabularNumber className={styles.streakNumber}>{streak}</TabularNumber>
              <span className={styles.streakWord}>day streak</span>
            </span>
          </span>
        </Label>
        {milestone && (
          <p className={styles.milestone}>
            A {streak}-day milestone!
            <InkRule className={styles.milestoneRule} />
          </p>
        )}
      </div>

      <dl className={styles.times}>
        <div className={`${styles.time} ${styles.today}`}>
          <dt className={styles.timeLabel}>Today</dt>
          <dd className={styles.timeValue}>
            <TabularNumber>{formatStudyTime(todaySeconds, "today")}</TabularNumber>
            <InkRule className={styles.underline} />
          </dd>
        </div>
        <div className={`${styles.time} ${styles.total}`}>
          <dt className={styles.timeLabel}>Total</dt>
          <dd className={styles.timeValue}>
            <TabularNumber>{formatStudyTime(totalSeconds, "total")}</TabularNumber>
            <InkRule className={styles.underline} />
          </dd>
        </div>
      </dl>
      <p className={styles.hint}>{streakHint(todaySeconds, streakMinMinutes, streak)}</p>
    </section>
  );
}

/** The page's one hint: what today still needs for the streak. */
function streakHint(todaySeconds: number, streakMinMinutes: number, streak: number): string {
  const remaining = Math.ceil((streakMinMinutes * 60 - todaySeconds) / 60);
  if (remaining <= 0) return "Today counts for your streak.";
  if (todaySeconds === 0) {
    return streak === 0
      ? `Study ${streakMinMinutes} min today to start a streak.`
      : `${streakMinMinutes} min today keeps your streak growing.`;
  }
  return streak === 0
    ? `${remaining} min to go until today starts your streak.`
    : `${remaining} min to go until today counts for your streak.`;
}
