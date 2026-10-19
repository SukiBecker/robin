import type { ReactNode } from "react";
import styles from "./page-shell.module.css";

type PageShellWidth = "narrow" | "wide";

type PageShellProps = {
  children: ReactNode;
  /** Rendered as the page's <h1>, first in the column. Leave it out when
      the heading sits inside other markup (e.g. a header row). */
  title?: ReactNode;
  /** narrow = 480px (Settings), wide = 720px (Statistics). */
  width?: PageShellWidth;
  /** Applied to the outer canvas element. */
  className?: string;
};

/** Canvas with the two soft glows and a centred content column. */
export function PageShell({ children, title, width = "narrow", className = "" }: PageShellProps) {
  return (
    <div className={[styles.page, className].filter(Boolean).join(" ")}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.glowSecondary} aria-hidden="true" />

      <div className={`${styles.shell} ${styles[width]}`}>
        {title && <h1 className={styles.heading}>{title}</h1>}
        {children}
      </div>
    </div>
  );
}
