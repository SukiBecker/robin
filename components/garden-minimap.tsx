"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import type { CameraListener } from "@/lib/garden/use-garden-camera";
import type { CellRect } from "@/lib/garden/world";
import styles from "./garden-minimap.module.css";

type GardenMinimapProps = {
  /** World size in cells. */
  cols: number;
  rows: number;
  /** Px per cell at zoom 1 — converts the camera (px) into cells. */
  cellPx: number;
  /** The plantable part of the world, outlined. */
  plantable: CellRect | null;
  /** Placed objects, as world-cell points. */
  dots: Array<{ id: string; x: number; y: number; isPath: boolean }>;
  subscribe: (listener: CameraListener) => () => void;
  /** Centers the camera on world cell (x, y); animated for a tap, instant
      while dragging across the map. */
  onJump: (x: number, y: number, animate: boolean) => void;
};

/** Small overview of the whole world with the current camera view as a
    frame. The frame is moved directly via its style on every camera
    change (same reason the camera itself skips React re-renders). */
export function GardenMinimap({
  cols,
  rows,
  cellPx,
  plantable,
  dots,
  subscribe,
  onJump,
}: GardenMinimapProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  useEffect(
    () =>
      subscribe((cam, viewport) => {
        const el = frameRef.current;
        if (!el) return;
        const worldW = cols * cellPx;
        const worldH = rows * cellPx;
        const left = (-cam.x / cam.zoom / worldW) * 100;
        const top = (-cam.y / cam.zoom / worldH) * 100;
        const width = (viewport.width / cam.zoom / worldW) * 100;
        const height = (viewport.height / cam.zoom / worldH) * 100;
        el.style.left = `${left}%`;
        el.style.top = `${top}%`;
        el.style.width = `${width}%`;
        el.style.height = `${height}%`;
      }),
    [subscribe, cols, rows, cellPx]
  );

  function cellAt(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * cols,
      y: ((event.clientY - rect.top) / rect.height) * rows,
    };
  }

  return (
    <div
      className={styles.minimap}
      style={{ aspectRatio: `${cols} / ${rows}` }}
      role="img"
      aria-label="Garden overview map"
      onPointerDown={(event) => {
        draggingRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        const { x, y } = cellAt(event);
        onJump(x, y, true);
      }}
      onPointerMove={(event) => {
        if (!draggingRef.current) return;
        const { x, y } = cellAt(event);
        onJump(x, y, false);
      }}
      onPointerUp={() => (draggingRef.current = false)}
      onPointerCancel={() => (draggingRef.current = false)}
    >
      <svg
        className={styles.map}
        viewBox={`0 0 ${cols} ${rows}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {plantable && (
          <rect
            className={styles.plantable}
            x={plantable.x}
            y={plantable.y}
            width={plantable.cols}
            height={plantable.rows}
            rx={1.2}
          />
        )}
        {dots.map((dot) =>
          dot.isPath ? (
            <rect
              key={dot.id}
              className={styles.pathDot}
              x={dot.x - 0.5}
              y={dot.y - 0.5}
              width={1}
              height={1}
            />
          ) : (
            <circle key={dot.id} className={styles.dot} cx={dot.x} cy={dot.y} r={0.75} />
          )
        )}
      </svg>
      <div ref={frameRef} className={styles.frame} />
    </div>
  );
}
