import Image from "next/image";
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode, Ref } from "react";
import styles from "./paper-panel.module.css";

type PaperVariant = "plain" | "lined" | "grid";
type PaperTape = "none" | "top" | "corners";
type PaperPadding = "sm" | "md" | "lg";

type PaperTag = "div" | "section" | "article";

/** Everything else (id, aria-labelledby, data-*, role, style, event
    handlers, ref …) goes straight to the root element. */
type PaperPanelProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  children: ReactNode;
  /** Root element (React 19: ref is a plain prop) — for motion, scroll
      anchors, measuring. */
  ref?: Ref<HTMLElement>;
  /** Rules drawn in --color-paper-line on top of the paper (not in the asset).
      lined = notebook: direct children sit on the lines (see the CSS). */
  variant?: PaperVariant;
  /** top = one long strip across the top edge, corners = two strips at the
      top corners (they stay clear of the text).
      Tape sticks out up to ~30px above and ≤ 12px to the sides — don't put
      the panel in a container with overflow: hidden. */
  tape?: PaperTape;
  /** Small rotation in degrees, clamped to ±3 (robin-design §4). Wide
      panels: at most 1°; stronger tilt only for small notes.
      The whole panel rotates, so content is never cut off. */
  tilt?: number;
  /** Inner space on top of the 18px torn-paper edge. */
  padding?: PaperPadding;
  /** section/article give the panel a landmark/meaning — pair it with
      aria-labelledby pointing at the heading inside. */
  as?: PaperTag;
};

const MAX_TILT = 3;

/** A sheet of journal paper: paper-note.webp as a 9-slice (the torn rim
    never distorts), with the warm
    --filter-paper shadow that follows the edge. Paper and shadow sit on a
    ::before behind the content, so the panel itself has no filter.
    Replaces the white Card (components/card.tsx). */
export function PaperPanel({
  children,
  variant = "plain",
  tape = "none",
  tilt = 0,
  padding = "md",
  as: Tag = "div",
  className = "",
  style: styleProp,
  ref,
  ...rest
}: PaperPanelProps) {
  const angle = Math.max(-MAX_TILT, Math.min(MAX_TILT, tilt));
  const style = angle
    ? ({ ...styleProp, "--paper-tilt": `${angle}deg` } as CSSProperties)
    : styleProp;

  return (
    <Tag
      {...rest}
      ref={ref as Ref<HTMLDivElement>}
      className={[
        styles.panel,
        angle ? styles.tilted : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      {tape === "top" && (
        <Image
          src="/ui/tape-long-1.webp"
          alt=""
          aria-hidden
          width={700}
          height={102}
          sizes="150px"
          className={`${styles.tape} ${styles.tapeTop}`}
        />
      )}
      {tape === "corners" && (
        <>
          <Image
            src="/ui/tape-long-1.webp"
            alt=""
            aria-hidden
            width={700}
            height={102}
            sizes="90px"
            className={`${styles.tape} ${styles.tapeLeft}`}
          />
          <Image
            src="/ui/tape-long-2.webp"
            alt=""
            aria-hidden
            width={700}
            height={101}
            sizes="90px"
            className={`${styles.tape} ${styles.tapeRight}`}
          />
        </>
      )}
      <div className={[styles.content, styles[variant], styles[padding]].join(" ")}>{children}</div>
    </Tag>
  );
}
