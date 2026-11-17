import type { CSSProperties, ReactNode } from "react";
import styles from "./tnum-fallback.module.css";

type TnumFallbackProps = {
  /** Digits to reserve room for; wider values still grow the box. */
  digits: number;
  children: ReactNode;
};

/** Fixed-width slot for a changing Fraunces number (see the CSS module). */
export function TnumFallback({ digits, children }: TnumFallbackProps) {
  return (
    <span
      className={styles.tnumFallback}
      style={{ "--tnum-digits": digits } as CSSProperties}
    >
      {children}
    </span>
  );
}
