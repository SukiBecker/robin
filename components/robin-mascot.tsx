import styles from "./robin-mascot.module.css";

type RobinMascotProps = {
  size?: number;
  className?: string;
  /**
   * "active" (default): the layered, animated bird — body + independent
   * wings, occasional resettling flap. Meant to sit on its own, over
   * whatever background the context provides (a card, the garden, etc).
   *
   * "sitting": a single static illustration, wings fully at rest,
   * perched on its own branch (baked into the image). No animation —
   * use this wherever Robin should just be resting rather than doing
   * anything, e.g. the shop perch.
   */
  pose?: "active" | "sitting";
};

/**
 * Robin (Rotkehlchen), the app's mascot. See docs/ROBIN.md §12 — Robin
 * also runs onboarding and appears in the shop and the post-session
 * reward moment, so this stays a single reusable component, sized and
 * posed by whatever context renders it.
 */
export function RobinMascot({ size = 160, className, pose = "active" }: RobinMascotProps) {
  if (pose === "sitting") {
    return (
      <div className={`${styles.stage} ${className ?? ""}`} style={{ width: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascot/robin-sitting.png" alt="Robin, resting on a branch" />
      </div>
    );
  }

  return (
    <div
      className={`${styles.stage} ${className ?? ""}`}
      style={{ width: size }}
      role="img"
      aria-label="Robin, the app's mascot"
    >
      <div className={`${styles.wingWrap} ${styles.wingWrapLeft}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.wingLeft} src="/mascot/robin-wing-left.png" alt="" aria-hidden="true" />
      </div>
      <div className={`${styles.wingWrap} ${styles.wingWrapRight}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.wingRight} src="/mascot/robin-wing-right.png" alt="" aria-hidden="true" />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.body} src="/mascot/robin-body.png" alt="" aria-hidden="true" />
    </div>
  );
}
