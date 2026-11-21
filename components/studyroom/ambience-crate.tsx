"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChoiceGroup } from "@/components/journal/choice-group";
import { FocusFrame } from "@/components/journal/ink";
import { Slider } from "@/components/journal/slider";
import { useBackgroundWorld } from "@/lib/studyroom/use-background-world";
import { CrateLidIcon } from "./icons";
import { worldName, type World } from "./session";
import styles from "./studyroom.module.css";

// Ambient sound mixer entries (layout only, no audio yet).
const AMBIENT_SOUNDS = [
  { id: "rain", name: "Rain" },
  { id: "white-noise", name: "White noise" },
  { id: "fire", name: "Fire" },
  { id: "waves", name: "Waves" },
  { id: "wind", name: "Wind" },
];

/** What the closed crate says: the sounds that are on, or Silence. */
function describeSounds(volumes: Record<string, number>) {
  const on = AMBIENT_SOUNDS.filter(({ id }) => (volumes[id] ?? 0) > 0).map(
    ({ name }) => name
  );
  if (on.length === 0) return "Silence";
  if (on.length <= 2) return on.join(" & ");
  return `${on[0]} + ${on.length - 1} more`;
}

type AmbienceCrateProps = {
  worlds: World[] | null;
  worldsError: string | null;
  level: number | null;
};

/** Ambience: a flat wooden crate on the potting bench holding what you
    hear (sounds) and where you are (place). Closed by default: its front
    board ("Ambience", burnt in) and the lid show only the current state
    ("Rain", "Silence" …) — the whole front is one button. Open, the
    inside rises above the front with the sliders and Place. Escape or a
    click elsewhere closes it again; focus goes back to the front. */
export function AmbienceCrate({
  worlds,
  worldsError,
  level,
}: AmbienceCrateProps) {
  const {
    worldId,
    loaded,
    error: settingsError,
    select,
  } = useBackgroundWorld();
  const [open, setOpen] = useState(false);
  // Volumes 0–100 per sound. They start at 0 (silent) on purpose: there is
  // no audio yet, and nothing is stored — study_room_settings.sound_volumes
  // (jsonb, default {}) stays unused until there is, then it supplies the
  // start values.
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const rootRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const insideId = useId();

  // A click or tap anywhere outside the crate closes it.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  // Places above the player's level stay visible but can't be picked. What
  // was stored (or nothing yet) falls back to the first unlocked place.
  const options =
    worlds && level !== null
      ? worlds.map((world) => {
          const locked = world.unlock_level > level;
          const name = worldName(world);
          return {
            value: String(world.id),
            label: locked ? `${name} · Lv ${world.unlock_level}` : name,
            srLabel: locked
              ? `${name}, unlocks at level ${world.unlock_level}`
              : name,
            disabled: locked,
          };
        })
      : null;
  const firstOpen = options?.find((o) => !o.disabled)?.value;
  const stored =
    worldId !== null
      ? options?.find((o) => o.value === String(worldId))
      : undefined;
  const selected = stored && !stored.disabled ? stored.value : firstOpen;

  const error = worldsError ?? settingsError;
  const state = describeSounds(volumes);

  return (
    <section
      ref={rootRef}
      aria-labelledby="ambience-title"
      className={styles.crate}
      data-open={open ? "" : undefined}
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.stopPropagation();
          setOpen(false);
          toggleRef.current?.focus();
        }
      }}
    >
      {/* The front comes first in the DOM, so Tab goes from it straight
          into the open inside; CSS puts the inside above it. */}
      <h2 className={styles.crateHeading}>
        <button
          ref={toggleRef}
          type="button"
          className={styles.crateToggle}
          aria-label={`Ambience: ${state}`}
          aria-expanded={open}
          aria-controls={insideId}
          onClick={() => setOpen((o) => !o)}
        >
          <span data-surface="wood" className={styles.crateLid}>
            <span className={styles.crateState}>{state}</span>
            <CrateLidIcon open={open} />
          </span>
          <span id="ambience-title" className={styles.crateFront}>
            Ambience
          </span>
          <FocusFrame className={styles.crateFocus} />
        </button>
      </h2>

      <div
        id={insideId}
        data-surface="wood"
        className={styles.crateInside}
        hidden={!open}
      >
        <div className={styles.soundList}>
          {AMBIENT_SOUNDS.map(({ id, name }) => (
            <Slider
              key={id}
              compact
              surface="wood"
              label={name}
              value={volumes[id] ?? 0}
              onChange={(event) =>
                setVolumes((v) => ({ ...v, [id]: Number(event.target.value) }))
              }
              step={5}
              aria-label={`${name} volume`}
            />
          ))}
        </div>

        {options && loaded && selected && (
          <ChoiceGroup
            legend="Place"
            options={options}
            value={selected}
            onChange={(value) => select(Number(value))}
            surface="wood"
          />
        )}
        {!options && !error && <p className={styles.body}>Loading…</p>}

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
