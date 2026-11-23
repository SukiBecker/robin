"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./vine-progress.module.css";

type VineProgressProps = {
  /** Study progress of the whole run, 0–1. Holds still in a break. */
  progress: number;
  /** null: no session — only a small shoot bottom left. */
  phase: "focus" | "break" | "complete" | null;
  paused?: boolean;
};

/** Geometry of the painted pieces, in pixels of the corner painting
    (printed by scripts/make-vine-assets.mjs; the CSS has the same
    numbers). The vertical tile is VINE.tile wide = --vine-w. */
const VINE = {
  tile: 264,
  corner: { w: 948, h: 733, stemX: 140.5, stemY: 108 },
  /** Where the corner's mask switches from "up the post" to "along the
      rail": the post's half width right of its stem. */
  cornerSplit: 140.5 + 132,
};

/** Where the blooms open at the end of a run: on the post (share of its
    length, from the sill) and on the rail (share of its length, from the
    corner; the last stretch stays free for the fullscreen button), and
    which of the three painted blooms. They open one after another, in
    the order the vine grew. */
const BLOOMS = [
  { side: "post", at: 0.3, img: 1 },
  { side: "post", at: 0.72, img: 2 },
  { side: "rail", at: 0.08, img: 3 },
  { side: "rail", at: 0.34, img: 1 },
  { side: "rail", at: 0.6, img: 2 },
] as const;

/** The three painted blooms: size (aspect) and where their stem ends,
    as a share of the width (they open from there). */
const BLOOM_IMAGES = {
  1: { w: 365, h: 371, base: 0.54 },
  2: { w: 402, h: 448, base: 0.553 },
  3: { w: 334, h: 442, base: 0.308 },
} as const;

type Geometry = {
  vineW: number;
  post: number; // length of the post piece (bottom → corner)
  cornerUp: number; // corner, bottom → rail line
  cornerAlong: number; // corner, post line → right edge
  splitOffset: number; // post line → mask split
  rail: number;
  // Positions (in the vine box) for the blooms.
  postX: number;
  railY: number;
  bottom: number;
  railX: number;
};

/**
 * The study progress as a painted vine on the window frame (replaces the
 * progress rail; docs/studyroom-schuppen-plan.md §3.1). It starts bottom
 * left, climbs the left post, turns at the corner and runs along the top
 * rail; the right post stays free (Robin sits there). Without a session
 * only a small shoot shows where it will grow. At the end of a run the
 * blooms open one by one.
 *
 * Three painted pieces (public/ui/vine-*.webp): the post and the rail are
 * seamless tiles, repeated; the corner joins them. The growth is a mask
 * along the path with a soft tip: one length (--vine-tip) runs over all
 * pieces, each piece shows what lies behind the tip, so the soft end
 * crosses from the post into the corner and on to the rail without a
 * break. The lengths are measured, so the growth has the same speed
 * everywhere at every window size.
 *
 * The progress changes once a second in small steps; without reduced
 * motion the tip glides between them. Phase and percent are not written
 * on the wall (no text on illustration); the slate shows them, screen
 * readers get them here.
 */
export function VineProgress({
  progress,
  phase,
  paused = false,
}: VineProgressProps) {
  const p =
    phase === "complete"
      ? 1
      : phase === null || !Number.isFinite(progress)
        ? 0
        : Math.min(1, Math.max(0, progress));
  // Floored, so it never reads 100 % before the run is actually done.
  const percent = phase === "complete" ? 100 : Math.floor(p * 100);
  const state =
    phase === "complete"
      ? "done"
      : paused
        ? "paused"
        : phase === "break"
          ? "break"
          : null;

  const rootRef = useRef<HTMLDivElement>(null);
  const postRef = useRef<HTMLSpanElement>(null);
  const cornerRef = useRef<HTMLSpanElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);
  const [geo, setGeo] = useState<Geometry | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const post = postRef.current;
    const corner = cornerRef.current;
    const rail = railRef.current;
    if (!root || !post || !corner || !rail) return;
    const measure = () => {
      const box = root.getBoundingClientRect();
      const c = corner.getBoundingClientRect();
      const r = rail.getBoundingClientRect();
      const k = c.width / VINE.corner.w;
      if (!k) return;
      setGeo({
        vineW: VINE.tile * k,
        post: post.getBoundingClientRect().height,
        cornerUp: (VINE.corner.h - VINE.corner.stemY) * k,
        cornerAlong: (VINE.corner.w - VINE.corner.stemX) * k,
        splitOffset: (VINE.cornerSplit - VINE.corner.stemX) * k,
        rail: r.width,
        postX: c.left - box.left + VINE.corner.stemX * k,
        railY: c.top - box.top + VINE.corner.stemY * k,
        bottom: box.height,
        railX: r.left - box.left,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  let vars: CSSProperties = {};
  let blooms: { x: number; y: number; side: "post" | "rail" }[] = [];
  if (geo) {
    const total = geo.post + geo.cornerUp + geo.cornerAlong + geo.rail;
    // Without a session: a short shoot. A run grows from there to the
    // end of the rail, whose last stretch stays soft (a tapering tip).
    const shoot = geo.vineW * 2.4;
    const tip = shoot + p * (total - shoot);
    vars = {
      "--vine-tip": `${tip}px`,
      // The soft tip: about one pair of leaves fades in.
      "--vine-soft": `${geo.vineW * 1.2}px`,
      "--vine-off-corner": `${geo.post}px`,
      "--vine-off-along": `${geo.post + geo.cornerUp + geo.splitOffset}px`,
      "--vine-off-rail": `${geo.post + geo.cornerUp + geo.cornerAlong}px`,
    } as CSSProperties;
    if (phase === "complete") {
      blooms = BLOOMS.map(({ side, at }) =>
        side === "post"
          ? { x: geo.postX, y: geo.bottom - at * geo.post, side }
          : { x: geo.railX + at * geo.rail, y: geo.railY, side }
      );
    }
  }

  return (
    <div
      ref={rootRef}
      className={styles.vine}
      data-phase={phase ?? undefined}
      data-ready={geo ? "" : undefined}
      style={vars}
      {...(phase === null
        ? { "aria-hidden": true }
        : {
            role: "progressbar",
            "aria-label": "Study progress",
            "aria-valuemin": 0,
            "aria-valuemax": 100,
            "aria-valuenow": percent,
            "aria-valuetext": `${percent} %${state ? `, ${state}` : ""}`,
          })}
    >
      <span ref={postRef} className={styles.post} />
      <span ref={cornerRef} className={styles.corner} />
      <span ref={railRef} className={styles.rail} />
      {blooms.map((b, i) => {
        const img = BLOOM_IMAGES[BLOOMS[i].img];
        return (
          <span
            key={i}
            className={styles.bloom}
            data-side={b.side}
            data-alt={i % 2 ? "" : undefined}
            style={
              {
                "--x": `${b.x}px`,
                "--y": `${b.y}px`,
                "--i": i,
                "--aspect": img.w / img.h,
                "--base": img.base,
                backgroundImage: `url("/ui/vine-bloom-${BLOOMS[i].img}.webp")`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
