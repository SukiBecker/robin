"use client";

import type { ReactNode, SyntheticEvent } from "react";
import { growthStage, type GrowthStage } from "@/lib/garden/garden-layout";
import styles from "./garden-object-popover.module.css";

/** Where a popover points, in world px (zoom 1): the top-center of the
    object it belongs to. */
export type PopoverAnchor = { x: number; y: number };

type AnchoredProps = {
  anchor: PopoverAnchor;
  /** Current camera zoom — the popover counter-scales, so it moves with
      the world but keeps its own size on screen. */
  zoom: number;
  children: ReactNode;
};

// Keeps clicks and drags on the popover from reaching the world under
// it (placing, closing the popover, or starting a camera pan).
const stop = (event: SyntheticEvent) => event.stopPropagation();

/** Positions its children above `anchor` in the world overlay. */
function Anchored({ anchor, zoom, children }: AnchoredProps) {
  return (
    <div
      className={styles.anchor}
      style={{
        left: anchor.x,
        top: anchor.y,
        transform: `translate(-50%, -100%) scale(${1 / zoom})`,
      }}
      onClick={stop}
      onPointerDown={stop}
      onMouseMove={stop}
    >
      {children}
    </div>
  );
}

const STAGE_LABELS: Record<Exclude<GrowthStage, "static">, string> = {
  seed: "Seed",
  growing: "Growing",
  grown: "Fully grown",
};

/** "1h 20m", "45m", "2h" — rounded up to the next minute. */
function formatStudyTime(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

type BubbleProps = {
  anchor: PopoverAnchor;
  zoom: number;
  name: string;
  growthPercent: number | null;
  growthDurationSeconds: number | null;
};

/** View mode: name, growth stage and — while growing — the study time
    still needed. growth_percent is floored server-side, so the time left
    can read up to 1% of the total growth time high. */
export function GardenObjectBubble({
  anchor,
  zoom,
  name,
  growthPercent,
  growthDurationSeconds,
}: BubbleProps) {
  const stage = growthStage(growthPercent);
  const secondsLeft =
    stage !== "static" && stage !== "grown" && growthDurationSeconds !== null
      ? (growthDurationSeconds * (100 - (growthPercent ?? 0))) / 100
      : null;

  return (
    <Anchored anchor={anchor} zoom={zoom}>
      <div className={styles.bubble} role="status">
        <p className={styles.name}>{name}</p>
        {stage !== "static" && (
          <span className={styles.stage} data-stage={stage}>
            {STAGE_LABELS[stage]}
          </span>
        )}
        {secondsLeft !== null && (
          <>
            <div
              className={styles.progress}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={growthPercent ?? 0}
              aria-label="Growth"
            >
              <span style={{ width: `${Math.max(4, growthPercent ?? 0)}%` }} />
            </div>
            <p className={styles.timeLeft}>
              <strong>{formatStudyTime(secondsLeft)}</strong> of study left
            </p>
          </>
        )}
      </div>
    </Anchored>
  );
}

type MenuProps = {
  anchor: PopoverAnchor;
  zoom: number;
  name: string;
  canRotate: boolean;
  busy: boolean;
  onMove: () => void;
  onRotate: () => void;
  onStore: () => void;
};

/** Edit mode: the actions for one placed object. */
export function GardenObjectMenu({
  anchor,
  zoom,
  name,
  canRotate,
  busy,
  onMove,
  onRotate,
  onStore,
}: MenuProps) {
  return (
    <Anchored anchor={anchor} zoom={zoom}>
      <div className={styles.menu} role="menu" aria-label={`${name} actions`}>
        <button
          type="button"
          role="menuitem"
          className={styles.action}
          onClick={onMove}
          disabled={busy}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" />
          </svg>
          Move
        </button>
        <button
          type="button"
          role="menuitem"
          className={styles.action}
          onClick={onRotate}
          disabled={busy || !canRotate}
          title={canRotate ? "Rotate (R)" : "This item can't be rotated"}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
            <path d="M19.8 3.8v4.6h-4.6" />
          </svg>
          Rotate
        </button>
        <button
          type="button"
          role="menuitem"
          className={`${styles.action} ${styles.actionStore}`}
          onClick={onStore}
          disabled={busy}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 8.5h16l-1.3 10.2a2 2 0 0 1-2 1.8H7.3a2 2 0 0 1-2-1.8z" />
            <path d="M3 5.5h18v3H3zM10 12.5h4" />
          </svg>
          Store
        </button>
      </div>
    </Anchored>
  );
}
