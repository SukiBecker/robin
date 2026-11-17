import type { ComponentPropsWithoutRef, Ref } from "react";
import styles from "./tabular-number.module.css";

type TabularNumberProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  /** The number as text or a number: digits plus the separators : , . / and
      spaces ("25:00", 1701, "1,240"). Anything else is set as it comes. */
  children: string | number;
  ref?: Ref<HTMLSpanElement>;
};

/**
 * A changing number whose box never changes width. Fraunces has no
 * tabular figures (measured: "1" is ~31 % narrower than "0"), so
 * `font-variant-numeric: tabular-nums` does nothing; here every digit sits
 * in a cell of fixed width (0.62em, centred) and the separators are
 * narrower. Use it wherever a number counts up or down in a spot where
 * its neighbours must not move (timer, coins, XP, level).
 *
 * Inherits font, size, weight and colour from its parent. Screen readers
 * get the plain text (the cells are aria-hidden), so "25:00" is read as a
 * time, not as digits.
 */
export function TabularNumber({ children, className = "", ref, ...rest }: TabularNumberProps) {
  const text = String(children);
  return (
    <span {...rest} ref={ref} className={`${styles.number} ${className}`}>
      <span className={styles.plain}>{text}</span>
      <span className={styles.cells} aria-hidden>
        {Array.from(text).map((ch, i) => {
          if (ch >= "0" && ch <= "9") {
            return (
              <span key={i} className={styles.digit}>
                {ch}
              </span>
            );
          }
          if (ch === ":" || ch === "," || ch === "." || ch === "/") {
            return (
              <span key={i} className={styles.sep}>
                {ch}
              </span>
            );
          }
          if (ch === " ") {
            return <span key={i} className={styles.space} />;
          }
          return ch;
        })}
      </span>
    </span>
  );
}
