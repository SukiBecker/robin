"use client";

import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { Quicksand } from "next/font/google";
import type { GardenObject } from "@/lib/garden/use-garden-objects";
import {
  categoryMaxWidthPercent,
  getItemIllustration,
  growthSizeFraction,
} from "@/lib/garden/item-visuals";
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
  /** Placement hover preview (Garden page only — Studyroom doesn't pass
      these). Wired straight to the plot div so callers can translate the
      cursor position into a grid cell the same way onContainerClick
      already does for the click position. */
  onContainerMouseMove?: (event: MouseEvent<HTMLDivElement>) => void;
  onContainerMouseLeave?: (event: MouseEvent<HTMLDivElement>) => void;
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
 * of far-the-top ones, plus a soft ground-contact shadow under each.
 *
 * Sizing is category-based, never a native pixel size from the source
 * art — see lib/garden/item-visuals.ts — so objects stay small/unobtrusive
 * with plenty of visible lawn between them, the way Animal Crossing reads,
 * rather than dominating the plot. A multi-cell item (item_catalog's
 * footprint_width, e.g. a 3x1 hedge) renders proportionally wider so it
 * visibly fills the grid cells it actually reserves — see
 * app/garden/page.tsx's placement/collision logic for that grid. Illustrated
 * items render their actual growth-stage art; anything without art yet
 * falls back to an abstract shape so new item rows never break rendering.
 *
 * Shared by the Garden page (interactive: place/remove) and the Studyroom
 * page (read-only background) so both render the exact same data the same
 * way.
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
  onContainerMouseMove,
  onContainerMouseLeave,
  busyObjectId = null,
  children,
}: GardenViewProps) {
  return (
    <div
      onClick={onContainerClick}
      onMouseMove={onContainerMouseMove}
      onMouseLeave={onContainerMouseLeave}
      className={`${styles.plot} ${bodyFont.variable}`}
      style={{ height, cursor }}
    >
      {objects?.length === 0 && <p className={styles.emptyState}>Nothing planted yet.</p>}

      {objects?.map((object) => {
        const stage = growthStage(object.growth_percent);
        const depthScale = 0.82 + (clampPercent(object.pos_y) / 100) * 0.34;
        // A multi-cell object (e.g. a 3x1 hedge) renders proportionally
        // wider so it visibly fills the grid cells place_garden_object()
        // reserved for it — footprint_width defaults to 1 (a normal
        // single-cell item), so this is a no-op for everything else.
        const widthPercent =
          categoryMaxWidthPercent(object.category, object.item_name) *
          object.footprint_width *
          growthSizeFraction(object.growth_percent) *
          depthScale *
          object.scale;
        // Decoration objects never grow (stage "static"), so there's only
        // ever one image for them — stored under the "grown" key.
        const illustration = getItemIllustration(object.item_name, stage === "static" ? "grown" : stage);
        const clickable = Boolean(onObjectClick);
        const busy = busyObjectId === object.id;

        // Bottom-anchored: the object's own base sits exactly at pos_y,
        // so a plant with a different aspect ratio per growth stage still
        // visibly grows upward/outward from the same rooted point instead
        // of just re-centering.
        const wrapStyle: CSSProperties = {
          left: `${object.pos_x}%`,
          top: `${object.pos_y}%`,
          width: `${widthPercent}%`,
          zIndex: Math.round(clampPercent(object.pos_y) * 10),
          transform: "translate(-50%, -100%)",
        };

        return (
          <div
            key={object.id}
            className={`${styles.objectWrap} ${clickable ? styles.objectClickable : ""} ${
              busy ? styles.objectBusy : ""
            }`}
            style={wrapStyle}
            onClick={onObjectClick ? (event) => onObjectClick(event, object.id) : undefined}
            title={`${object.item_name ?? "item"} — growth_percent: ${
              object.growth_percent ?? "n/a"
            }${onObjectClick ? " — click to remove" : ""}`}
          >
            <div className={styles.objectShadow} />
            {illustration ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.objectImage} src={illustration} alt="" />
            ) : (
              <div
                className={styles.object}
                data-stage={stage}
                data-shape={stage === "static" ? "prop" : "organic"}
              />
            )}
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

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}
