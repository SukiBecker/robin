"use client";

import { useState } from "react";
import { Button } from "@/components/journal/button";
import { PaperPanel } from "@/components/journal/paper-panel";
import { XpSeedJar } from "@/components/journal/xp-seed-jar";
import { XpSeedRow } from "@/components/journal/xp-seed-row";
import styles from "./components.module.css";

/* D6: XP. XpSeedRow is the standard (compact = header, large = Journal);
   XpSeedJar is large only, for the Journal page. Both straight on paper.
   "+10 XP" drives every example. */

const MAX = 70;
const LEVEL = 8;

function RowMeta({ children }: { children: string }) {
  return <p className={styles.labelRowMeta}>{children}</p>;
}

function Name({ children }: { children: string }) {
  return <p className={styles.xpVariantName}>{children}</p>;
}

export function XpPlate() {
  return (
    <p className={styles.note}>
      XpSeedRow is the XP bar: a seed per full tenth of the level, a seed drops in when one is
      earned, and the tenth in progress shows as a half-buried seed in quarters (no motion with
      reduced motion). “Next level” jumps straight to the new state. XpSeedJar is for the Journal
      page only. On narrow rows the compact seed row drops “/ 70” and keeps “42 XP”. The last
      panel shows compact at 343, 300 and 260 px.
    </p>
  );
}

export function XpStage() {
  const [xp, setXp] = useState(42);
  const [level, setLevel] = useState(LEVEL);

  return (
    <div className={styles.panelRows}>
      <div className={styles.labelRow}>
        <RowMeta>seed row · compact · large · seed jar (large)</RowMeta>
        <PaperPanel padding="md" className={styles.xpPanel}>
          <div className={styles.xpVariant}>
            <Name>Seed row</Name>
            <XpSeedRow value={xp} max={MAX} level={level} />
            <XpSeedRow value={xp} max={MAX} level={level} size="large" />
          </div>
          <div className={styles.xpVariant}>
            <Name>Seed jar</Name>
            <XpSeedJar value={xp} max={MAX} level={level} />
          </div>
          <div className={styles.labelGroup}>
            <Button onClick={() => setXp((v) => Math.min(MAX, v + 10))} disabled={xp >= MAX}>
              +10 XP
            </Button>
            <Button variant="secondary" onClick={() => setXp(0)}>
              Reset
            </Button>
            <Button variant="quiet" onClick={() => setXp(68)}>
              Almost full
            </Button>
            {/* stands in for the server's level-up: new level, XP back to 0,
                shown at once (no backwards animation) */}
            <Button
              variant="quiet"
              onClick={() => {
                setLevel((l) => l + 1);
                setXp(0);
              }}
            >
              Next level
            </Button>
          </div>
        </PaperPanel>
      </div>

      <div className={styles.labelRow}>
        <RowMeta>0 · 42 · 68 of 70 · compact and large</RowMeta>
        <PaperPanel padding="md" className={styles.xpPanel}>
          {[0, 42, 68].map((v) => (
            <div key={v} className={styles.xpVariant}>
              <XpSeedRow value={v} max={MAX} level={LEVEL} />
              <XpSeedRow value={v} max={MAX} level={LEVEL} size="large" />
            </div>
          ))}
        </PaperPanel>
      </div>

      <div className={styles.labelRow}>
        <RowMeta>343 px (375 px screen) · 0 · 42 / 70 · 68 / 70 · 1,240 / 2,400</RowMeta>
        <div className={styles.xpNarrow}>
          <PaperPanel padding="sm">
            <XpSeedRow value={0} max={MAX} level={1} />
            <XpSeedRow value={xp} max={MAX} level={LEVEL} />
            <XpSeedRow value={68} max={MAX} level={12} />
            <XpSeedRow value={1240} max={2400} level={23} />
            <XpSeedRow value={xp} max={MAX} level={LEVEL} size="large" />
          </PaperPanel>
        </div>
      </div>

      <div className={styles.labelRow}>
        <RowMeta>compact · 343 · 300 · 260 px</RowMeta>
        <div className={styles.xpNarrow}>
          {[343, 300, 260].map((w) => (
            <PaperPanel key={w} padding="sm" style={{ width: w, maxWidth: "100%" }}>
              <XpSeedRow value={xp} max={MAX} level={LEVEL} />
            </PaperPanel>
          ))}
        </div>
      </div>
    </div>
  );
}
