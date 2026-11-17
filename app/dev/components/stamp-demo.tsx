"use client";

import { useState } from "react";
import { Button } from "@/components/journal/button";
import { PaperPanel } from "@/components/journal/paper-panel";
import { Stamp } from "@/components/journal/stamp";
import styles from "./components.module.css";

/* D4: Stamp. A stamp always sits on paper — so every example here is in
   a PaperPanel, also in Studyroom mode (the garden is only behind the
   paper). Replay remounts the animated stamps via their key. */

function RowMeta({ children }: { children: string }) {
  return <p className={styles.labelRowMeta}>{children}</p>;
}

export function StampPlate() {
  return (
    <p className={styles.note}>
      Postmark (round) and rubber stamps (rect, double) in the three stamp inks,
      printed at 85% with a slightly uneven ink. The plant is a one-colour
      impression of the final growth stage (its darker lines; a solid silhouette
      for pale plants). Press Replay for the “press” animation (off with reduced
      motion). Stamps only ever sit on paper.
    </p>
  );
}

export function StampStage() {
  const [round, setRound] = useState(0);

  return (
    <div className={styles.panelRows}>
      <div className={styles.labelRow}>
        <RowMeta>shape round · rect · double × green · rust · blue</RowMeta>
        <PaperPanel className={styles.demoPanel}>
          <div className={styles.stampGrid}>
            <Stamp top="The Garden" center="W46" bottom="2026" />
            <Stamp
              top="The Garden"
              center="Sep 2026"
              bottom="est."
              color="rust"
              rotate={4}
            />
            <Stamp
              top="Week 46"
              center="3 h"
              bottom="studied"
              color="blue"
              rotate={-10}
            />
            <Stamp
              shape="rect"
              top="The Garden"
              center="W46"
              bottom="Nov 2026"
            />
            <Stamp
              shape="rect"
              top="Received"
              center="16 Nov"
              color="rust"
              rotate={3}
            />
            <Stamp shape="rect" center="Planted" color="blue" rotate={-12} />
            <Stamp
              shape="double"
              top="Not yet issued"
              center="Beach"
              bottom="Level 10"
            />
            <Stamp
              shape="double"
              top="First bloom"
              center="Rose"
              color="rust"
              rotate={5}
            />
            <Stamp
              shape="double"
              top="Next stop"
              center="Lvl 10"
              color="blue"
              rotate={-3}
            />
          </div>
        </PaperPanel>
      </div>

      <div className={styles.labelRow}>
        <RowMeta>
          plant (print lines) · alone · above center · peony as silhouette (pale
          plant)
        </RowMeta>
        <PaperPanel variant="lined" className={styles.demoPanel}>
          <div className={styles.stampGrid}>
            <Stamp
              top="The Garden"
              bottom="W46"
              plant="/garden/items/rose-3.png"
              plantName="Rose"
            />
            <Stamp
              top="The Garden"
              center="W46"
              bottom="2026"
              plant="/garden/items/lavender-3.png"
              plantName="Lavender"
              color="blue"
              rotate={7}
            />
            <Stamp
              shape="rect"
              top="Pressed"
              center="Peony"
              plant="/garden/items/peony-3.png"
              plantName="Peony"
              plantPrint="silhouette"
              color="rust"
            />
            <Stamp
              shape="double"
              top="The Garden"
              bottom="est. Sep 2026"
              plant="/garden/items/tulip-3.png"
              plantName="Tulip"
              rotate={-9}
            />
          </div>
        </PaperPanel>
      </div>

      <div className={styles.labelRow}>
        <RowMeta>
          size sm · md · lg · rotate 0 · -15 · +15 (clamped from 40)
        </RowMeta>
        <PaperPanel className={styles.demoPanel}>
          <div className={styles.stampGrid}>
            <Stamp size="sm" top="The Garden" center="W46" bottom="2026" />
            <Stamp size="md" top="The Garden" center="W46" bottom="2026" />
            <Stamp size="lg" top="The Garden" center="W46" bottom="2026" />
            <Stamp shape="rect" size="sm" top="Week" center="46" rotate={0} />
            <Stamp
              shape="rect"
              size="lg"
              top="Week"
              center="46"
              color="rust"
              rotate={-15}
            />
            <Stamp
              shape="double"
              size="sm"
              top="Week"
              center="46"
              color="blue"
              rotate={40}
            />
          </div>
        </PaperPanel>
      </div>

      <div className={styles.labelRow}>
        <RowMeta>animate · Replay remounts the stamps</RowMeta>
        <PaperPanel className={styles.demoPanel}>
          <div className={styles.stampGrid}>
            <Stamp
              key={`a${round}`}
              animate
              top="The Garden"
              center="W46"
              bottom="2026"
            />
            <Stamp
              key={`b${round}`}
              animate
              shape="double"
              top="First bloom"
              plant="/garden/items/rose-3.png"
              plantName="Rose"
              center="Rose"
              color="rust"
              rotate={5}
            />
            <Stamp
              key={`c${round}`}
              animate
              shape="rect"
              center="Planted"
              color="blue"
              rotate={-12}
            />
          </div>
          <div>
            <Button variant="secondary" onClick={() => setRound((r) => r + 1)}>
              Replay
            </Button>
          </div>
        </PaperPanel>
      </div>
    </div>
  );
}
