"use client";

import { useEffect, useState, type RefObject } from "react";
import { CELL_PX, EDGE_CELLS } from "./world";

/**
 * How far (canvas px at zoom 1) the tallest placed object reaches above
 * the garden's top edge — a tree in row 0 stands on its cell but its
 * crown grows up past it. The camera may show that much above the garden
 * so nothing gets cut off. Capped at the edge band, past which there is
 * no lawn to show.
 *
 * Measured from the rendered DOM (an organic object's height follows its
 * image's own aspect ratio), again whenever the objects change or one of
 * their images finishes loading.
 */
export function useTopOverhang(
  worldRef: RefObject<HTMLDivElement | null>,
  canvasWidth: number,
  objects: unknown,
  ready: boolean
): number {
  const [overhang, setOverhang] = useState(0);

  useEffect(() => {
    const canvas = worldRef.current;
    if (!ready || !canvas || canvasWidth <= 0) return;

    function measure() {
      const rect = canvas!.getBoundingClientRect();
      // The canvas is scaled by the camera; undo that so the result is in
      // canvas px whatever the zoom is right now.
      const zoom = rect.width / canvasWidth;
      if (!zoom) return;
      const gardenTop = rect.top + EDGE_CELLS * CELL_PX * zoom;
      let highest = gardenTop;
      canvas!.querySelectorAll<HTMLElement>("[data-object-id]").forEach((el) => {
        highest = Math.min(highest, el.getBoundingClientRect().top);
      });
      const next = Math.min(EDGE_CELLS * CELL_PX, Math.ceil((gardenTop - highest) / zoom));
      setOverhang((current) => (current === next ? current : next));
    }

    measure();
    // `load` doesn't bubble, so listen in the capture phase.
    canvas.addEventListener("load", measure, true);
    return () => canvas.removeEventListener("load", measure, true);
  }, [worldRef, canvasWidth, objects, ready]);

  return overhang;
}
