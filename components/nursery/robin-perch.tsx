import Image from "next/image";
import styles from "./robin-perch.module.css";

export type PerchMood = "neutral" | "happy" | "sad";

const SRC: Record<PerchMood, string> = {
  neutral: "/ui/robin-neutral.webp",
  happy: "/ui/robin-happy.webp",
  sad: "/ui/robin-sad.webp",
};
const MOODS = Object.keys(SRC) as PerchMood[];

type RobinPerchProps = {
  mood: PerchMood;
  /** Where he sits: the parent positions him on a paper edge. */
  className?: string;
};

/**
 * Mini Robin sitting on the upper edge of a paper (robin-design §3
 * Nursery). Purely decorative: alt="" and aria-hidden, the information
 * stays in text. All three moods are mounted and stacked, only opacity
 * switches, so the images are loaded up front and nothing flickers when
 * the mood changes. "happy" hops once (only without reduced motion).
 */
export function RobinPerch({ mood, className = "" }: RobinPerchProps) {
  return (
    <span className={`${styles.perch} ${className}`} data-mood={mood} aria-hidden="true">
      <span className={styles.hop}>
        {MOODS.map((m) => (
          <Image
            key={m}
            src={SRC[m]}
            alt=""
            width={160}
            height={256}
            unoptimized
            loading="eager"
            draggable={false}
            className={`${styles.img} ${m === mood ? styles.on : ""}`}
          />
        ))}
      </span>
    </span>
  );
}
