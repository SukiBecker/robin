import { LockIcon } from "@/components/lock-icon";
import {
  FireIcon,
  RainIcon,
  WavesIcon,
  WhiteNoiseIcon,
  WindIcon,
} from "./icons";
import type { World } from "./session";
import { Slip } from "./slip";
import styles from "./studyroom.module.css";

// Ambient sound mixer entries (layout only, no audio yet).
const AMBIENT_SOUNDS = [
  { id: "rain", name: "Rain", Icon: RainIcon },
  { id: "white-noise", name: "White noise", Icon: WhiteNoiseIcon },
  { id: "fire", name: "Fire", Icon: FireIcon },
  { id: "waves", name: "Waves", Icon: WavesIcon },
  { id: "wind", name: "Wind", Icon: WindIcon },
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
      {/* Sliders start at 0 (silent). */}
      <ul className={styles.soundList}>
        {AMBIENT_SOUNDS.map(({ id, name, Icon }) => (
          <li key={id} className={styles.soundItem}>
            <span className={styles.soundIcon}>
              <Icon />
            </span>
            <label htmlFor={`sound-${id}`} className={styles.soundName}>
              {name}
            </label>
            <input
              id={`sound-${id}`}
              type="range"
              min={0}
              max={100}
              defaultValue={0}
              className={styles.soundSlider}
              aria-label={`${name} volume`}
            />
          </li>
        ))}
      </ul>

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
