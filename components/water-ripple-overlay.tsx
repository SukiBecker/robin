"use client";

import type { CSSProperties } from "react";
import styles from "./water-ripple-overlay.module.css";

/** Allows CSS custom properties ("--foo") alongside normal style keys —
    used to hand per-point timing/scale into the CSS animations below
    without a separate stylesheet rule per point. */
type CSSVarStyle = CSSProperties & Record<`--${string}`, string | number>;

export type RipplePoint = {
  /** 0-100, position relative to THIS component's own box (i.e. the
      water item's rendered <img>, not the garden plot) — matches
      wherever a water jet actually lands on the art. */
  xPercent: number;
  yPercent: number;
  /** Stagger offset in seconds so multiple splash points don't pulse in
      sync — see the design note on WaterRippleOverlay below. */
  delaySeconds?: number;
  /** Scales this point's ring size relative to the others (1 = default) —
      e.g. a smaller/farther splash can use a smaller value. */
  scale?: number;
};

export type WaterRippleOverlayProps = {
  ripplePoints: RipplePoint[];
  /** Diagonal light-sweep angle, CSS gradient-angle syntax (e.g. 120). */
  sweepAngleDeg?: number;
  /** Off for items where the sweep doesn't read well (e.g. a very small
      water surface) — the ripple rings still render. */
  showSweep?: boolean;
  className?: string;
};

/**
 * Ambient CSS placeholder for "moving water" on top of an otherwise
 * static item illustration — expanding/fading ripple rings at each
 * water-jet landing point, plus a slow diagonal glint sweep across the
 * whole surface. Pure CSS overlay: the underlying <img> is never
 * touched, so this can sit on top of ANY static water illustration
 * (fountain, waterfall, pond, ...) just by passing different
 * `ripplePoints` — see lib/garden/water-overlay-config.ts for the
 * per-item lookup that decides which items get one.
 *
 * Deliberately generic/config-driven rather than fountain-specific, and
 * deliberately just an overlay (not baked into the item's own art or
 * GardenScene's rendering branch) so a later real sprite-frame water
 * animation can replace it as a drop-in swap: same props, same mount
 * point, different internals.
 *
 * Renders nothing animated under prefers-reduced-motion: reduce — see
 * the stylesheet — so the static illustration shows completely
 * unchanged for anyone who's asked for less motion.
 */
export function WaterRippleOverlay({
  ripplePoints,
  sweepAngleDeg = 125,
  showSweep = true,
  className,
}: WaterRippleOverlayProps) {
  if (ripplePoints.length === 0 && !showSweep) return null;

  return (
    <div
      className={`${styles.overlay} ${className ?? ""}`}
      aria-hidden="true"
    >
      {ripplePoints.map((point, pointIndex) =>
        // 3 concentric rings per point, each starting a beat after the
        // last (--ring-index below), so a point reads as continuously
        // "emitting" ripples rather than 3 rings blinking in unison.
        [0, 1, 2].map((ringIndex) => (
          <span
            key={`${pointIndex}-${ringIndex}`}
            className={styles.ring}
            style={
              {
                left: `${point.xPercent}%`,
                top: `${point.yPercent}%`,
                "--point-delay": `${point.delaySeconds ?? 0}s`,
                "--ring-index": ringIndex,
                "--point-scale": point.scale ?? 1,
              } as CSSVarStyle
            }
          />
        ))
      )}
      {showSweep && (
        <span
          className={styles.glintSweep}
          style={{ "--sweep-angle": `${sweepAngleDeg}deg` } as CSSVarStyle}
        />
      )}
    </div>
  );
}
