"use client";

import { useState } from "react";
import type { InventoryItem } from "@/app/garden/page";
import { InventoryTray } from "@/components/inventory-tray";

function demoItem(
  itemId: string,
  name: string,
  category: string,
  isGrown: boolean,
  growthDurationSeconds: number | null,
  quantity: number
): InventoryItem {
  return {
    itemId,
    isGrown,
    quantity,
    name,
    footprintWidth: 1,
    footprintHeight: 1,
    category,
    isPrecisePlacement: false,
    grows: growthDurationSeconds !== null,
    growthDurationSeconds,
  };
}

/** Seed and grown stock side by side, plus decoration (never a seed). */
const DEMO_ITEMS: InventoryItem[] = [
  demoItem("rose", "Rose", "flower", false, 10800, 3),
  demoItem("rose", "Rose", "flower", true, 10800, 1),
  demoItem("tulip", "Tulip", "flower", false, 300, 12),
  demoItem("sunflower", "Sunflower", "flower", false, 5400, 2),
  demoItem("lavender", "Lavender", "flower", true, 7200, 4),
  demoItem("hedge", "Hedge", "plant", false, 5400, 2),
  demoItem("hedge", "Hedge", "plant", true, 5400, 1),
  demoItem("bush", "Bush", "plant", false, 187200, 1),
  demoItem("lantern", "Garden Lantern", "decoration", false, null, 2),
  demoItem("bench", "Bench", "decoration", false, null, 1),
];

/** The Garden's inventory tray with fixed demo stock (the page itself is
    a server component). */
export function InventoryTrayDemo() {
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  return (
    <InventoryTray
      open
      items={DEMO_ITEMS}
      selected={selected}
      onSelect={(item) =>
        setSelected((current) =>
          current?.itemId === item.itemId && current.isGrown === item.isGrown
            ? null
            : item
        )
      }
      rotation={0}
      canRotate={false}
      onRotate={() => {}}
      disabled={false}
    />
  );
}
