"use client";

import { useState } from "react";
import { Bookmark } from "@/components/journal/bookmark";
import type { GameIconName } from "@/components/journal/game-icon";
import { InkRule } from "@/components/journal/ink";
import styles from "./components.module.css";

/* Bookmark ribbons (variant A): a mock journal frame with the five
   screens. Click a ribbon to make it the current one. Below the frame:
   left the garden (the ribbon end hangs over it), right paper. */

const ITEMS: { icon: GameIconName; label: string }[] = [
  { icon: "studyroom", label: "Studyroom" },
  { icon: "garden", label: "Garden" },
  { icon: "nursery", label: "Nursery" },
  { icon: "journal", label: "Journal" },
  { icon: "settings", label: "Settings" },
];

export function BookmarkPlate() {
  return (
    <p className={styles.note}>
      Navigation as ribbons hanging from the journal frame. The current screen hangs longer and is
      painted green; the others hang short in linen. The link is exactly the height of the
      frame (that is the click area and what pages measure); the end below is decoration only and
      may lie over the garden. Icons at 24 px; nursery, journal and settings are placeholders. The
      ribbon is a painted asset: the swallowtail end stays fixed, the body stretches with the
      length.
    </p>
  );
}

export function BookmarkStage() {
  const [current, setCurrent] = useState("Garden");

  return (
    <div className={styles.bookmarkDemo}>
      <div className={styles.bookmarkFrame}>
        {/* the drawn edge first, so the ribbons lie over it */}
        <InkRule className={styles.bookmarkEdge} />
        <span className={styles.bookmarkBrand}>Robin</span>
        <nav aria-label="Demo navigation" className={styles.bookmarkRow}>
          {ITEMS.map((item) => (
            <Bookmark
              key={item.label}
              href={`#bookmark-${item.label.toLowerCase()}`}
              icon={item.icon}
              label={item.label}
              active={current === item.label}
              onClick={(event) => {
                event.preventDefault();
                setCurrent(item.label);
              }}
            />
          ))}
        </nav>
      </div>
      <div className={styles.bookmarkBelow}>
        <div className={styles.bookmarkGarden} />
        <div className={styles.bookmarkPaper} />
      </div>
    </div>
  );
}
