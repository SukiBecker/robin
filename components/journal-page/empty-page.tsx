import { RobinNote } from "@/components/journal/robin-note";
import styles from "./empty-page.module.css";

type EmptyPageProps = {
  /** app_config.streak_min_minutes_per_day — what the first page needs. */
  streakMinMinutes: number;
};

/** The Journal's left page for a brand-new user (no study time yet): a
    blank page with a pencil sketch of a seedling that isn't drawn out yet
    and Robin's note. No numbers, no calendar — nothing to count yet. Robin
    appears as a picture here because the first page is an onboarding
    moment (robin-design §4, RobinNote). */
export function EmptyPage({ streakMinMinutes }: EmptyPageProps) {
  return (
    <section className={styles.empty} aria-label="Your first journal page">
      <PencilSeedling className={styles.sketch} />
      <RobinNote mood="neutral" className={styles.note}>
        Your first page is still blank. Study {streakMinMinutes} minutes and
        we&apos;ll start it.
      </RobinNote>
    </section>
  );
}

/** A seedling in pencil: ground line, stem, two leaves — and, dashed, the
    bloom it will grow into. Decorative. Pencil is --color-ink-soft (lines
    and sketches only, never text). */
function PencilSeedling({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 150"
      aria-hidden="true"
      focusable="false"
    >
      {/* ground */}
      <path
        d="M14 126C44 122 74 128 100 124S160 121 186 126"
        className={styles.line}
      />
      <path
        d="M32 134C60 131 84 135 110 132"
        className={`${styles.line} ${styles.faint}`}
      />
      {/* stem and leaves */}
      <path d="M100 124C99 108 101 92 100 78" className={styles.line} />
      <path
        d="M100 100C88 98 76 91 72 79C85 79 96 86 100 100Z"
        className={styles.line}
      />
      <path
        d="M100 88C112 86 122 79 126 68C113 68 103 75 100 88Z"
        className={styles.line}
      />
      {/* the bloom, only dashed */}
      <g
        className={`${styles.line} ${styles.dashed}`}
        transform="translate(100 76) scale(1.6) translate(-100 -76)"
      >
        <path d="M100 76C90 70 88 58 96 50C98 56 100 60 100 66" />
        <path d="M100 76C110 70 112 58 104 50C102 56 100 60 100 66" />
        <path d="M100 66C90 62 82 54 84 44C92 46 98 54 100 66Z" />
        <path d="M100 66C110 62 118 54 116 44C108 46 102 54 100 66Z" />
      </g>
    </svg>
  );
}
