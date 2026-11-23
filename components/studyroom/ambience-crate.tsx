"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Button } from "@/components/journal/button";
import { ChoiceGroup } from "@/components/journal/choice-group";
import { FocusFrame } from "@/components/journal/ink";
import { Slider } from "@/components/journal/slider";
import { NoteDialog } from "@/components/place/note-dialog";
import { useBackgroundWorld } from "@/lib/studyroom/use-background-world";
import { worldName, type World } from "./session";
import styles from "./studyroom.module.css";

// Ambient sound mixer entries (layout only, no audio yet).
export const AMBIENT_SOUNDS = [
  { id: "rain", name: "Rain" },
  { id: "white-noise", name: "White noise" },
  { id: "fire", name: "Fire" },
  { id: "waves", name: "Waves" },
  { id: "wind", name: "Wind" },
];

/** What the closed crate says: the sounds that are on, or Silence. */
export function describeSounds(volumes: Record<string, number>) {
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

/** The painted crate (scripts/make-crate.mjs): both states on one canvas,
    anchored bottom left, so they stack exactly. */
const CRATE_SRC = {
  closed: "/ui/crate-closed.webp",
  open: "/ui/crate-open.webp",
} as const;

/** How long the crate takes to open before the panel appears (and the
    crossfade + hop in studyroom.module.css). */
const CRATE_OPEN_MS = 200;

/** Ambience: a small painted wooden crate (a music note burnt into its
    front) at the right end of the shelf, much smaller than the slate. A
    click opens it: closed → open crossfade with a small hop (~200 ms),
    then the panel (NoteDialog) with a slider per sound and the Place.
    Closing runs the other way: the panel goes, the lid shuts with the
    same hop. With reduced motion the pictures switch at once and the
    panel opens straight away. Esc, a click outside or Close shut it;
    focus goes back to the crate. The button is as big as the closed
    crate (≥ 44 px); the lid's room above it takes no clicks. */
export function AmbienceCrate({
  worlds,
  worldsError,
  level,
}: AmbienceCrateProps) {
  // open: the panel is open. lidOpen: which picture shows. moved: the
  // crate has been opened once, so the hop may play (never on first
  // paint).
  const [open, setOpen] = useState(false);
  const [lidOpen, setLidOpen] = useState(false);
  const [moved, setMoved] = useState(false);
  const reduceMotion = useReducedMotion();
  const openTimer = useRef<number | undefined>(undefined);
  // Volumes 0–100 per sound. They start at 0 (silent) on purpose: there is
  // no audio yet, and nothing is stored — study_room_settings.sound_volumes
  // (jsonb, default {}) stays unused until there is, then it supplies the
  // start values. Kept here, so they survive closing the panel.
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const toggleRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => () => window.clearTimeout(openTimer.current), []);

  const state = describeSounds(volumes);

  function handleOpen() {
    if (open || lidOpen) return; // already opening
    setMoved(true);
    setLidOpen(true);
    if (reduceMotion) {
      setOpen(true);
      return;
    }
    openTimer.current = window.setTimeout(() => setOpen(true), CRATE_OPEN_MS);
  }

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        className={styles.crateBox}
        data-lid={lidOpen ? "open" : "closed"}
        data-moved={moved || undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Ambience: ${state}`}
        onClick={handleOpen}
      >
        <span className={styles.crateArt} aria-hidden="true">
          <Image
            src={CRATE_SRC.closed}
            alt=""
            width={384}
            height={218}
            unoptimized
            loading="eager"
            draggable={false}
            className={`${styles.crateImg} ${lidOpen ? "" : styles.crateImgOn}`}
          />
          <Image
            src={CRATE_SRC.open}
            alt=""
            width={384}
            height={218}
            unoptimized
            loading="eager"
            draggable={false}
            className={`${styles.crateImg} ${lidOpen ? styles.crateImgOn : ""}`}
          />
        </span>
        <FocusFrame className={styles.crateFocus} />
      </button>

      {open && (
        <NoteDialog
          labelledBy={titleId}
          width="22rem"
          onClose={() => {
            setOpen(false);
            setLidOpen(false);
            toggleRef.current?.focus();
          }}
        >
          {(close) => (
            <section data-surface="wood" className={styles.cratePanel}>
              <h2 id={titleId} className={styles.cratePanelTitle}>
                Ambience
              </h2>
              <AmbienceMixer
                worlds={worlds}
                worldsError={worldsError}
                level={level}
                volumes={volumes}
                onVolumeChange={(id, value) =>
                  setVolumes((v) => ({ ...v, [id]: value }))
                }
              />
              <Button
                variant="quiet"
                onClick={close}
                className={styles.cratePanelClose}
              >
                Close
              </Button>
            </section>
          )}
        </NoteDialog>
      )}
    </>
  );
}

type AmbienceMixerProps = {
  worlds: World[] | null;
  worldsError: string | null;
  level: number | null;
  volumes: Record<string, number>;
  onVolumeChange: (id: string, value: number) => void;
};

/** What is inside the crate: a slider per sound and the Place. Shared by
    the crate's panel and the Ambience panel of the bar layout; its
    user keeps the volumes, so they survive closing. */
export function AmbienceMixer({
  worlds,
  worldsError,
  level,
  volumes,
  onVolumeChange,
}: AmbienceMixerProps) {
  const {
    worldId,
    loaded,
    error: settingsError,
    select,
  } = useBackgroundWorld();
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
  return (
    <>
      <div className={styles.soundList}>
        {AMBIENT_SOUNDS.map(({ id, name }) => (
          <Slider
            key={id}
            compact
            surface="wood"
            label={name}
            value={volumes[id] ?? 0}
            onChange={(event) => onVolumeChange(id, Number(event.target.value))}
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
    </>
  );
}
