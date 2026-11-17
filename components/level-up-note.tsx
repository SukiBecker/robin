"use client";

import { useEffect, useRef } from "react";
import { RobinNote } from "./journal/robin-note";
import styles from "./level-up-note.module.css";

/** How long the note stays (ms); paused while the pointer or focus is on it. */
const SHOW_MS = 7000;

/** Fired on window in development to show the note without a real
    level-up (detail: the level to announce). See the XP demo on
    /dev/components ("Next level"). */
export const DEV_LEVEL_UP_EVENT = "robin:dev-level-up";

type LevelUpNoteProps = {
  /** The new level while the note shows, null when hidden. */
  level: number | null;
  onDismiss: () => void;
  className?: string;
};

/**
 * Interim level-up moment (Phase 1, step 8b) until the big orchestrated
 * level-up exists: a short RobinNote slip with Robin, under the journal
 * frame. Goes away by itself after a few seconds, on click or with Escape.
 *
 * The live region is always rendered (role="status", polite), so screen
 * readers announce the note when its text is inserted.
 */
export function LevelUpNote({ level, onDismiss, className = "" }: LevelUpNoteProps) {
  const timer = useRef<number | undefined>(undefined);
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  function stop() {
    window.clearTimeout(timer.current);
  }
  function start() {
    stop();
    timer.current = window.setTimeout(() => onDismissRef.current(), SHOW_MS);
  }

  useEffect(() => {
    if (level === null) return;
    timer.current = window.setTimeout(() => onDismissRef.current(), SHOW_MS);
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onDismissRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer.current);
      window.removeEventListener("keydown", onKey);
    };
  }, [level]);

  return (
    <div role="status" aria-live="polite" className={`${styles.region} ${className}`}>
      {level !== null && (
        // Click anywhere on the slip to put it away; keyboard users have
        // Escape, and it leaves by itself.
        <div
          key={level}
          className={styles.slip}
          onClick={onDismiss}
          onMouseEnter={stop}
          onMouseLeave={start}
        >
          <RobinNote as="div" surface="slip" mood="happy">
            Level {level}! New seeds are waiting.
          </RobinNote>
        </div>
      )}
    </div>
  );
}
