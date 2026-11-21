import styles from "./ink.module.css";

/* Hand-drawn ink for the journal blocks (robin-design §4): a line and a
   frame with a slight, natural wobble. Both stretch to any size
   (preserveAspectRatio="none") while the stroke stays even
   (non-scaling-stroke); width and colour come from the consumer's CSS
   via the --ink-* tokens. Decorative: always aria-hidden. */

/* A rule across the full width, wobbling ±0.8 units around y = 3. The svg
   is 6 units high, so at 6px height the wobble is under 1px. */
const RULE =
  "M0.8 3.3C24 2.5 46 3.7 70 3.1S118 2.3 142 3.2S182 3.6 199.2 2.7";

/* A frame that goes once around and overshoots its start a little, like
   a pen. Corners are not exact, edges bow by a fraction of a unit. */
const FRAME =
  "M2.4 3.1C30 2.3 68 3.5 97.6 2.5C97.2 14 98.2 26 97.7 37.6C68 38.5 31 37.3 2.2 37.9C2.8 26 1.9 14 2.7 1.7";

/* An arrow pointing right: a slightly wobbling shaft and a two-stroke
   head, drawn like the rule. Kept in proportion (no stretching), so the
   head never deforms. */
const ARROW_SHAFT = "M1.2 7.4C8 6.6 15 7.6 22 6.9S31 6.6 37.6 7";
const ARROW_HEAD = "M32.2 2.9C34.2 4.4 36 5.8 38 7C36.1 8.1 34.3 9.5 32.6 11.3";

type InkProps = { className?: string };

/** A hand-drawn horizontal ink line. Give it a height (≈ 0.375rem) and a
    stroke via CSS. */
export function InkRule({ className = "" }: InkProps) {
  return (
    <svg className={`${styles.ink} ${className}`} viewBox="0 0 200 6" preserveAspectRatio="none" aria-hidden focusable="false">
      <path d={RULE} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** A small hand-drawn ink arrow pointing right (e.g. between steps of a
    row). In the flow, not absolute; give it a width (height follows,
    10:3) and a stroke via CSS (default --ink-line). Mirror it with
    transform for other directions. Decorative. */
export function InkArrow({ className = "" }: InkProps) {
  return (
    <svg className={`${styles.ink} ${styles.arrow} ${className}`} viewBox="0 0 40 12" aria-hidden focusable="false">
      <path d={ARROW_SHAFT} vectorEffect="non-scaling-stroke" />
      <path d={ARROW_HEAD} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** A hand-drawn ink frame around its box. Position it with inset and
    give it a stroke via CSS. */
export function InkFrame({ className = "" }: InkProps) {
  return (
    <svg className={`${styles.ink} ${className}`} viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden focusable="false">
      <path d={FRAME} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** The one focus mark for every control (robin-design §4, "Fokus"):
    the hand-drawn frame in --ink-stroke, over a paper halo so it shows
    on the garden as well. Hidden until the consumer shows it on
    :focus-visible (opacity: 1). Place it with inset. */
export function FocusFrame({ className = "" }: InkProps) {
  return (
    <svg
      className={`${styles.ink} ${styles.focus} ${className}`}
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
    >
      <path className={styles.halo} d={FRAME} vectorEffect="non-scaling-stroke" />
      <path className={styles.mark} d={FRAME} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
