"use client";

import { useId, type KeyboardEvent } from "react";
import { FocusFrame } from "@/components/journal/ink";
import { TabularNumber } from "@/components/journal/tabular-number";
import styles from "./studyroom.module.css";

type RoundsStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
};

/** Rounds on the slate: "− 1 +" in chalk, instead of a number field with
    the browser's spinner arrows. A spinbutton for assistive tech (arrow
    keys, Home/End work on it); the two chalk signs are big hit areas for
    pointer and touch and stay out of the tab order — the number itself is
    the one stop (pressing a sign keeps focus where it was). At a bound the sign fades to muted chalk. */
export function RoundsStepper({
  value,
  onChange,
  min = 1,
  max = 12,
}: RoundsStepperProps) {
  const labelId = useId();
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const set = (n: number) => {
    const next = clamp(n);
    if (next !== value) onChange(next);
  };

  function handleKeyDown(event: KeyboardEvent) {
    const keys: Record<string, number> = {
      ArrowUp: value + 1,
      ArrowRight: value + 1,
      ArrowDown: value - 1,
      ArrowLeft: value - 1,
      Home: min,
      End: max,
    };
    if (event.key in keys) {
      event.preventDefault();
      set(keys[event.key]);
    }
  }

  return (
    <div className={styles.stepper}>
      <span id={labelId} className={styles.stepperLabel}>
        Rounds
      </span>
      <div className={styles.stepperRow}>
        <button
          type="button"
          tabIndex={-1}
          className={styles.stepperSign}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => set(value - 1)}
          aria-hidden="true"
          data-off={value <= min ? "" : undefined}
        >
          −
        </button>
        <span
          role="spinbutton"
          tabIndex={0}
          aria-labelledby={labelId}
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuetext={`${value} ${value === 1 ? "round" : "rounds"}`}
          onKeyDown={handleKeyDown}
          className={styles.stepperValue}
        >
          <TabularNumber>{String(value)}</TabularNumber>
          <FocusFrame className={styles.stepperFocus} />
        </span>
        <button
          type="button"
          tabIndex={-1}
          className={styles.stepperSign}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => set(value + 1)}
          aria-hidden="true"
          data-off={value >= max ? "" : undefined}
        >
          +
        </button>
      </div>
    </div>
  );
}
