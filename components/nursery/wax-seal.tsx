import styles from "./wax-seal.module.css";

type WaxSealProps = {
  /** item_catalog.unlock_level, pressed into the seal as text. */
  level: number;
  className?: string;
};

/** A wax seal on a locked item, with the unlock level as real text in
    the seal's hollow. Replaces the lock icon and the "Unlock at Level X"
    sign. Decorative for screen readers — the item's aria-label carries
    "locked until level X". Painted seal public/ui/wax-seal.webp
    (original design-src/ui/wax-seal.png). */
export function WaxSeal({ level, className = "" }: WaxSealProps) {
  const value = Number.isFinite(level) ? Math.max(1, Math.round(level)) : 1;
  return (
    <span className={`${styles.seal} ${className}`} aria-hidden="true">
      <span className={styles.text}>
        <span className={styles.kicker}>Lv</span>
        <span className={styles.level}>{value}</span>
      </span>
    </span>
  );
}
