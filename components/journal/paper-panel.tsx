import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import styles from "./paper-panel.module.css";

type PaperVariant = "plain" | "lined" | "grid";
type PaperTape = "none" | "top" | "corners";
type PaperPadding = "sm" | "md" | "lg";

type PaperPanelProps = {
  children: ReactNode;
  /** Rules drawn in --color-paper-line on top of the paper (not in the asset).
      lined = notebook: direct children sit on the lines (see the CSS). */
  variant?: PaperVariant;
  /** top = one long strip across the top edge, corners = two strips at the
      top corners. The tape sticks out ~14px above the panel — don't put the
      panel in a container with overflow: hidden. */
  tape?: PaperTape;
  /** Small rotation in degrees, clamped to ±3 (robin-design: keep it ±1–3°).
      The whole panel rotates, so content is never cut off. */
  tilt?: number;
  /** Inner space on top of the 18px torn-paper edge. */
  padding?: PaperPadding;
  as?: "div" | "section";
  className?: string;
};

const MAX_TILT = 3;

/** A sheet of journal paper: paper-note.webp as a 9-slice, so the torn,
    aged edges never stretch, with the warm --filter-paper shadow that
    follows the edge. Replaces the white Card (components/card.tsx). */
export function PaperPanel({
  children,
  variant = "plain",
  tape = "none",
  tilt = 0,
  padding = "md",
  as: Tag = "div",
  className = "",
}: PaperPanelProps) {
  const angle = Math.max(-MAX_TILT, Math.min(MAX_TILT, tilt));
  const style = angle ? ({ "--paper-tilt": `${angle}deg` } as CSSProperties) : undefined;

  return (
    <Tag
      className={[styles.panel, angle ? styles.tilted : "", className].filter(Boolean).join(" ")}
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
