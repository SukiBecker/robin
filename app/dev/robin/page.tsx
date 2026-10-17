"use client";

import { useState } from "react";
import { Button } from "@/components/button";
import { RobinPerched, type RobinMood } from "@/components/robin-perched";
import styles from "./robin.module.css";

const MOODS: { mood: RobinMood; label: string }[] = [
  { mood: "neutral", label: "Neutral" },
  { mood: "happy", label: "Happy" },
  { mood: "sad", label: "Sad" },
];

/** Dev-only playground for RobinPerched's mood switches and animations. */
export default function DevRobinPage() {
  const [mood, setMood] = useState<RobinMood>("neutral");

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>RobinPerched</h1>

      <div className={styles.stageRow}>
        <figure className={styles.cell}>
          <div className={styles.ground}>
            <RobinPerched mood={mood} size={240} />
          </div>
          <figcaption>240 px</figcaption>
        </figure>
        <figure className={styles.cell}>
          <div className={styles.ground}>
            <RobinPerched mood={mood} />
          </div>
          <figcaption>96 px (Standard)</figcaption>
        </figure>
      </div>

      <div className={styles.controls}>
        {MOODS.map(({ mood: m, label }) => (
          <Button
            key={m}
            variant={m === mood ? "primary" : "secondary"}
            aria-pressed={m === mood}
            onClick={() => setMood(m)}
          >
            {label}
          </Button>
        ))}
      </div>
    </main>
  );
}
