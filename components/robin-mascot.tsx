import styles from "./robin-mascot.module.css";

type RobinMascotProps = {
  size?: number;
  className?: string;
};

/**
 * Robin (Rotkehlchen), Bloomly's mascot. Three layered PNGs
 * (public/mascot/) stacked on identical canvases: body on top, both
 * wings behind it, each rotating from its actual shoulder position for
 * an occasional resettling flap. See docs/BLOOMLY.md §12 — Robin also
 * runs onboarding and appears in the shop and the post-session reward
 * moment, so this stays a single reusable component sized/placed by
 * whatever context renders it.
 */
export function RobinMascot({ size = 160, className }: RobinMascotProps) {
  return (
    <div
      className={`${styles.stage} ${className ?? ""}`}
      style={{ width: size }}
      role="img"
      aria-label="Robin, the Bloomly mascot"
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
