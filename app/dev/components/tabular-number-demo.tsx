"use client";

import { useEffect, useState } from "react";
import { PaperPanel } from "@/components/journal/paper-panel";
import { TabularNumber } from "@/components/journal/tabular-number";
import styles from "./components.module.css";

/* TabularNumber: the same counting number twice — plain Fraunces (the
   box breathes, the neighbours move) and in TabularNumber (still). */

function mmss(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function TabularNumberPlate() {
  return (
    <p className={styles.note}>
      Fraunces has no tabular figures — <code>tabular-nums</code> changes nothing, and “1” is about a
      third narrower than “0”. <code>TabularNumber</code> puts every digit in a cell 0.62em wide
      (centred); “: , . /” and spaces get narrower cells. It takes font, size and colour from its
      parent and gives screen readers the plain text. Used in the Studyroom timer, the coin count,
      the XP amount and the level numbers. Below: a countdown in plain Fraunces next to one in
      TabularNumber — watch the marker after each number.
    </p>
  );
}

export function TabularNumberStage() {
  const [t, setT] = useState(11 * 60 + 11);

  useEffect(() => {
    const id = window.setInterval(() => setT((v) => (v <= 0 ? 11 * 60 + 11 : v - 1)), 700);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className={styles.panelRow}>
      <PaperPanel padding="md" className={styles.tabularPanel}>
        <p className={styles.tabularCaption}>Plain Fraunces</p>
        <p className={styles.tabularBig}>
          <span>{mmss(t)}</span>
          <span className={styles.tabularMarker} aria-hidden>
            ◆
          </span>
        </p>
        <p className={styles.tabularBig}>
          <span>{(1701 + t * 3).toLocaleString("en-US")}</span>
          <span className={styles.tabularMarker} aria-hidden>
            ◆
          </span>
        </p>
      </PaperPanel>
      <PaperPanel padding="md" className={styles.tabularPanel}>
        <p className={styles.tabularCaption}>TabularNumber</p>
        <p className={styles.tabularBig}>
          <TabularNumber>{mmss(t)}</TabularNumber>
          <span className={styles.tabularMarker} aria-hidden>
            ◆
          </span>
        </p>
        <p className={styles.tabularBig}>
          <TabularNumber>{(1701 + t * 3).toLocaleString("en-US")}</TabularNumber>
          <span className={styles.tabularMarker} aria-hidden>
            ◆
          </span>
        </p>
      </PaperPanel>
    </div>
  );
}
