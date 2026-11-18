import { LockIcon } from "@/components/lock-icon";
import { Slider } from "@/components/journal/slider";
import type { World } from "./session";
import { Slip } from "./slip";
import styles from "./studyroom.module.css";

// Ambient sound mixer entries (layout only, no audio yet).
const AMBIENT_SOUNDS = [
  { id: "rain", name: "Rain" },
  { id: "white-noise", name: "White noise" },
  { id: "fire", name: "Fire" },
  { id: "waves", name: "Waves" },
  { id: "wind", name: "Wind" },
];

// The home garden is always shown as selected for now; saving the choice
// (study_room_settings.background_world_id) comes with the ChoiceGroup.
const SELECTED_WORLD_SLUG = "garden";

type AmbienceSlipProps = {
  worlds: World[] | null;
  worldsError: string | null;
  level: number | null;
};

/** Ambience: what you hear (sounds) and where you are (place). */
export function AmbienceSlip({ worlds, worldsError, level }: AmbienceSlipProps) {
  return (
    <Slip id="ambience" title="Ambience" tilt={-0.8}>
      {/* Names as text, one slider each, two columns. They start at 0
          (silent); no audio yet. */}
      <div className={styles.soundList}>
        {AMBIENT_SOUNDS.map(({ id, name }) => (
          <Slider
            key={id}
            compact
            label={name}
            defaultValue={0}
            step={5}
            aria-label={`${name} volume`}
          />
        ))}
      </div>

      <h3 className={styles.subTitle}>Place</h3>

      {worldsError && (
        <p role="alert" className={styles.error}>
          {worldsError}
        </p>
      )}
      {!worlds && !worldsError && <p className={styles.body}>Loading…</p>}

      {/* Locked places stay visible, so there's something to look
          forward to. */}
      {worlds && level !== null && (
        <ul className={styles.worldList}>
          {worlds.map((world) => {
            const locked = world.unlock_level > level;
            const selected = world.slug === SELECTED_WORLD_SLUG;
            return (
              <li key={world.id}>
                <button
                  type="button"
                  className={`${styles.worldOption} ${
                    selected ? styles.worldOptionSelected : ""
                  }`}
                  aria-pressed={selected}
                  disabled={locked}
                >
                  <span className={styles.worldName}>{world.name}</span>
                  {locked && (
                    <span className={styles.worldLock}>
                      <LockIcon size={16} />
                      Lv {world.unlock_level}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Slip>
  );
}
