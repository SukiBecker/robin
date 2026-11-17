import type { ReactNode } from "react";
import { Label } from "@/components/journal/label";
import { PaperPanel } from "@/components/journal/paper-panel";
import styles from "./studyroom.module.css";

type SlipProps = {
  /** Used for the heading id (`slip-<id>`) the section is labelled by. */
  id: string;
  title: string;
  /** Small rotation of the whole slip; wide slips stay at ≤ 1°. */
  tilt?: number;
  className?: string;
  children: ReactNode;
};

/** One journal slip on Robin's desk under the garden: paper with a strip
    of tape on top and its name as a typewriter label. On desktop the slip
    keeps the row's fixed height and its body scrolls inside the paper. */
export function Slip({ id, title, tilt = 0, className = "", children }: SlipProps) {
  const headingId = `slip-${id}`;
  return (
    <PaperPanel
      as="section"
      tape="top"
      padding="sm"
      tilt={tilt}
      aria-labelledby={headingId}
      className={`${styles.slip} ${className}`}
    >
      <h2 id={headingId} className={styles.slipTitle}>
        <Label>{title}</Label>
      </h2>
      <div className={styles.slipBody}>{children}</div>
    </PaperPanel>
  );
}
