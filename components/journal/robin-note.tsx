import Image from "next/image";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import styles from "./robin-note.module.css";

type RobinNoteSurface = "paper" | "slip";
type RobinMood = "neutral" | "happy" | "sad";
type RobinArrow = "up" | "down" | "left" | "right";

/** Everything else (id, data-*, role, style, event handlers …) goes
    straight to the root element. */
type RobinNoteProps = Omit<ComponentPropsWithoutRef<"p">, "children"> & {
  /** One or two short sentences in Robin's voice (≈ 32 characters per line). */
  children: ReactNode;
  /** Root element (React 19: ref is a plain prop). */
  ref?: Ref<HTMLElement>;
  /** paper = text only, for use inside a PaperPanel.
      slip = its own small torn paper slip (paper-note.webp, 9-slice) with
      a strip of honey tape, slightly tilted — for use directly over the
      garden. Handwriting never sits directly on an illustration. */
  surface?: RobinNoteSurface;
  /** Mini Robin at the lower left corner — only for special moments
      (onboarding, first bloom, level-up). Replaces the footprints next to
      the signature; the signature stays. Decorative. */
  mood?: RobinMood;
  /** Small hand-drawn arrow in the same ink, reaching out past the edge
      of the note at the last line (decorative). On narrow screens
      left/right drop below the note. */
  arrow?: RobinArrow;
  /** p (default) for a single note, div where a p is not allowed. */
  as?: "p" | "div";
  /** slip only: the honey tape on top (default). false when the slip is
      fixed some other way, e.g. nailed to wood at the place level. */
  tape?: boolean;
};

const ROBIN_SRC: Record<RobinMood, string> = {
  neutral: "/ui/robin-neutral.webp",
  happy: "/ui/robin-happy.webp",
  sad: "/ui/robin-sad.webp",
};

/** A handwritten note in Robin's voice: Caveat in fountain-pen blue
    (--color-stamp-blue), signed "— R." with two little bird footprints.

    Rules (robin-design §4, §5, §10):
    - Never for buttons, prices or important numbers.
    - At most one RobinNote per screen.
    - Must make sense without the Robin picture: picture, footprints,
      signature and arrow are decorative (alt="" / aria-hidden), the text
      carries it all.
    - The Robin picture (mood) only for special moments; the signature is
      the everyday voice.
    - On the garden always surface="slip" — never handwriting directly on
      an illustration. */
export function RobinNote({
  children,
  surface = "paper",
  mood,
  arrow,
  as: Tag = "p",
  tape = true,
  className = "",
  ref,
  ...rest
}: RobinNoteProps) {
  return (
    <Tag
      {...rest}
      ref={ref as Ref<HTMLParagraphElement>}
      className={[
        styles.note,
        styles[surface],
        mood ? styles.withRobin : "",
        arrow ? styles[`has-${arrow}`] : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className={styles.body}>
        {surface === "slip" && tape && (
          <Image
            src="/ui/tape-long-1.webp"
            alt=""
            aria-hidden
            width={700}
            height={102}
            sizes="110px"
            className={styles.tape}
          />
        )}
        <span className={styles.text}>{children}</span>
        <span className={styles.signature} aria-hidden>
          <span className={styles.initial}>— R.</span>
          {!mood && <Footprints />}
        </span>
        {arrow && <HandArrow direction={arrow} />}
        {mood && (
          <Image
            src={ROBIN_SRC[mood]}
            alt=""
            aria-hidden
            width={160}
            height={256}
            sizes="48px"
            className={styles.robin}
          />
        )}
      </span>
    </Tag>
  );
}

/** One bird footprint around its heel (0,0): three widely spread toes
    forward, one back, a small pad where they meet. Drawn a little
    unevenly. */
function Print({ transform }: { transform: string }) {
  return (
    <g transform={transform}>
      <path
        d="M-.6-1.2q-3-2.6-5.8-7.4M0-1.8q.8-4.4-.1-9.4M.6-1.2q3.2-2.2 6.4-6.6M0 .8q-.3 2.4.2 4.6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx="0" cy="-.4" rx="2.1" ry="2.5" fill="currentColor" />
    </g>
  );
}

/** Two bird footprints, one step apart; the second turned a little. */
function Footprints() {
  return (
    <svg viewBox="0 0 44 30" aria-hidden focusable="false" className={styles.footprints}>
      <Print transform="translate(10 21) rotate(-12)" />
      <Print transform="translate(31 15) rotate(22) scale(.94)" />
    </svg>
  );
}

/* The arrow's strokes: a paper-coloured halo underneath (≈ 1.5px each
   side), so the part outside the note stays visible on the garden. */
const ARROW_PATHS = {
  horizontal: [
    "M3 22c5.5 6.4 13.6 8.3 26 6.6 9.2-1.3 17-4.8 25-10.6",
    "M45 17.4c3.2-.1 6-.1 9 .6-1.2 2.3-2.8 4.4-4.4 6.8",
  ],
  vertical: [
    "M14 3c-6.4 7.6-8.2 16.2-5.6 24.4 1.8 6 5.2 11.4 9.6 16.6",
    "M17.6 35c.3 3.2.4 6.1.4 9-2.6-1-5-2.3-7.3-3.8",
  ],
};

/** Two drawings, not one rotated arrow: a horizontal swoosh (right; left
    is its mirror image) and a vertical one (down; up is its mirror). The
    shafts bow, the head strokes differ in length. */
function HandArrow({ direction }: { direction: RobinArrow }) {
  const horizontal = direction === "left" || direction === "right";
  const paths = ARROW_PATHS[horizontal ? "horizontal" : "vertical"];
  return (
    <svg
      viewBox={horizontal ? "-2 -2 62 36" : "-2 -2 36 54"}
      aria-hidden
      focusable="false"
      className={`${styles.arrow} ${styles[`arrow-${direction}`]}`}
    >
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <g className={styles.arrowHalo}>
          {paths.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <g className={styles.arrowInk} stroke="currentColor">
          {paths.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </g>
    </svg>
  );
}
