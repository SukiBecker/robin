"use client";

import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { Quicksand } from "next/font/google";
import type { GardenObject } from "@/lib/garden/use-garden-objects";
import styles from "./garden-view.module.css";

const bodyFont = Quicksand({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-body",
});

type GardenViewProps = {
  objects: GardenObject[] | null;
  height?: string;
  cursor?: string;
  onContainerClick?: (event: MouseEvent<HTMLDivElement>) => void;
  onObjectClick?: (event: MouseEvent<HTMLDivElement>, objectId: string) => void;
  busyObjectId?: string | null;
  /** Overlaid inside the (relatively positioned) garden container — used
      by the Studyroom page to keep timer/session controls in the foreground
      above the garden background. */
  children?: ReactNode;
};

/**
 * Renders a user's garden objects at their pos_x/pos_y (as percentages of
 * this container), styled with an Animal Crossing–style "looking slightly
 * down" feel: near-the-bottom objects render bigger, warmer and in front
 * of far-the-top ones, plus a soft ground-contact shadow under each. No
 * illustration assets yet — growth stage reads through shape/size/color
 * instead. Shared by the Garden page (interactive: place/remove) and the
 * Studyroom page (read-only background) so both render the exact same
 * data the same way.
 *
 * The container itself stays a flat, untransformed 2D plane — the depth
 * illusion is per-object (see depthScale), never a 3D transform on the
 * container — so pos_x/pos_y click math in the Garden page keeps working
 * unchanged.
 */
export function GardenView({
  objects,
  height = "600px",
  cursor = "default",
  onContainerClick,
  onObjectClick,
  busyObjectId = null,
  children,
}: GardenViewProps) {
  return (
    <div
      onClick={onContainerClick}
      className={`${styles.plot} ${bodyFont.variable}`}
      style={{ height, cursor }}
    >
      {objects?.length === 0 && <p className={styles.emptyState}>Nothing planted yet.</p>}

      {objects?.map((object) => {
        const stage = growthStage(object.growth_percent);
        const depthScale = 0.82 + (clampPercent(object.pos_y) / 100) * 0.34;
        const size = baseSize(stage) * depthScale;
        const clickable = Boolean(onObjectClick);
        const busy = busyObjectId === object.id;

        const wrapStyle: CSSProperties = {
          left: `${object.pos_x}%`,
          top: `${object.pos_y}%`,
          width: `${size}px`,
          height: `${size}px`,
          zIndex: Math.round(clampPercent(object.pos_y) * 10),
          transform: "translate(-50%, -60%)",
        };

        return (
          <div
            key={object.id}
            className={`${styles.objectWrap} ${clickable ? styles.objectClickable : ""} ${
              busy ? styles.objectBusy : ""
            }`}
            style={wrapStyle}
            onClick={onObjectClick ? (event) => onObjectClick(event, object.id) : undefined}
            title={`growth_percent: ${object.growth_percent ?? "n/a"}${
              onObjectClick ? " — click to remove" : ""
            }`}
          >
            <div className={styles.objectShadow} />
            <div
              className={styles.object}
              data-stage={stage}
              data-shape={stage === "static" ? "prop" : "organic"}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        );
      })}

      {children}
    </div>
  );
}

type GrowthStage = "static" | "seed" | "growing" | "grown";

function growthStage(growthPercent: number | null): GrowthStage {
  if (growthPercent === null) return "static"; // not growable, e.g. decoration
  if (growthPercent >= 100) return "grown";
  if (growthPercent <= 0) return "seed";
  return "growing";
}

function baseSize(stage: GrowthStage): number {
  switch (stage) {
    case "seed":
      return 18;
    case "growing":
      return 30;
    case "grown":
      return 44;
    case "static":
      return 40;
  }
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}
