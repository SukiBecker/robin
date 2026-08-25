"use client";

import type { MouseEvent, ReactNode } from "react";
import type { GardenObject } from "@/lib/garden/use-garden-objects";

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
 * Plain colored-box rendering of a user's garden objects, positioned at
 * their pos_x/pos_y (as percentages of this container) and labeled with
 * their growth state. No illustration assets yet. Shared by the Garden
 * page (interactive: place/remove) and the Studyroom page (read-only
 * background) so both render the exact same data the same way.
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
      style={{
        position: "relative",
        width: "100%",
        height,
        border: "1px solid #ccc",
        cursor,
      }}
    >
      {objects?.length === 0 && <p>Nothing planted yet.</p>}

      {objects?.map((object) => (
        <div
          key={object.id}
          onClick={
            onObjectClick ? (event) => onObjectClick(event, object.id) : undefined
          }
          title={`growth_percent: ${object.growth_percent ?? "n/a"}${
            onObjectClick ? " — click to remove" : ""
          }`}
          style={{
            position: "absolute",
            left: `${object.pos_x}%`,
            top: `${object.pos_y}%`,
            transform: "translate(-50%, -50%)",
            width: "48px",
            height: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            fontSize: "0.7rem",
            color: "#fff",
            backgroundColor: growthColor(object.growth_percent),
            cursor: onObjectClick
              ? busyObjectId !== null
                ? "default"
                : "pointer"
              : "default",
            opacity: busyObjectId === object.id ? 0.5 : 1,
          }}
        >
          {growthLabel(object.growth_percent)}
        </div>
      ))}

      {children}
    </div>
  );
}

function growthLabel(growthPercent: number | null): string {
  if (growthPercent === null) return "—";
  if (growthPercent >= 100) return "grown";
  if (growthPercent <= 0) return "seed";
  return "growing";
}

function growthColor(growthPercent: number | null): string {
  if (growthPercent === null) return "#9ca3af"; // gray — not growable (e.g. decoration)
  if (growthPercent >= 100) return "#16a34a"; // green — grown
  if (growthPercent <= 0) return "#a16207"; // brown — seed
  return "#eab308"; // amber — growing
}
