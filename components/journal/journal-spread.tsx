import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { PaperPanel } from "./paper-panel";
import styles from "./journal-spread.module.css";

type JournalSpreadProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  /** Left page: "this moment" (streak, today/total, calendar). */
  left: ReactNode;
  /** Right page: "the journey" (seed jar, stamps, next stop, weeks). */
  right: ReactNode;
  ref?: Ref<HTMLElement>;
};

/** The Journal as an open book: one sheet of paper (PaperPanel), two pages
    with the fold in the middle once the sheet is at least 48rem wide;
    narrower, the right page follows the left on a single page. Measured
    on the sheet itself (container query), not the viewport.
    Wide, so it never tilts (robin-design §4). */
export function JournalSpread({ left, right, className = "", ref, ...rest }: JournalSpreadProps) {
  return (
    <PaperPanel
      {...rest}
      ref={ref}
      padding="md"
      className={[styles.sheet, className].filter(Boolean).join(" ")}
    >
      <div className={styles.spread}>
        <div className={styles.page}>{left}</div>
        <div className={styles.fold} aria-hidden="true" />
        <div className={styles.page}>{right}</div>
      </div>
    </PaperPanel>
  );
}
