"use client";

import { useEffect, useState, type ReactNode } from "react";
import styles from "./components.module.css";

const BACKGROUNDS = [
  { value: "paper", label: "Paper" },
  { value: "studyroom", label: "Studyroom" },
] as const;

type Background = (typeof BACKGROUNDS)[number]["value"];

const STORAGE_KEY = "dev-components-bg";

/** Page wrapper with the Paper / Studyroom background switch.
    Paper = journal level, Studyroom = public/dev/studyroom-reference.jpg. */
export function BackgroundStage({
  intro,
  className,
  children,
}: {
  intro: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const [bg, setBg] = useState<Background>("paper");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "paper" || saved === "studyroom") setBg(saved);
    } catch {
      // storage blocked: keep the default
    }
  }, []);

  function choose(value: Background) {
    setBg(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // storage blocked: the choice just won't be remembered
    }
  }

  return (
    <div className={className ? `${styles.page} ${className}` : styles.page} data-bg={bg}>
      <header className={styles.header}>
        {intro}
        <fieldset className={styles.switch}>
          <legend className={styles.switchLegend}>Background</legend>
          {BACKGROUNDS.map((b) => (
            <label key={b.value} className={styles.switchOption}>
              <input
                type="radio"
                name="dev-background"
                value={b.value}
                checked={bg === b.value}
                onChange={() => choose(b.value)}
              />
              {b.label}
            </label>
          ))}
        </fieldset>
      </header>
      {children}
    </div>
  );
}
