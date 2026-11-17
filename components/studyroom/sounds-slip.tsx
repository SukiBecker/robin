import {
  FireIcon,
  RainIcon,
  SoundsIcon,
  WavesIcon,
  WhiteNoiseIcon,
  WindIcon,
} from "./icons";
import styles from "./studyroom.module.css";

// Ambient sound mixer entries for the Sounds card (layout only in V1).
const AMBIENT_SOUNDS = [
  { id: "rain", name: "Rain", Icon: RainIcon },
  { id: "white-noise", name: "White noise", Icon: WhiteNoiseIcon },
  { id: "fire", name: "Fire", Icon: FireIcon },
  { id: "waves", name: "Waves", Icon: WavesIcon },
  { id: "wind", name: "Wind", Icon: WindIcon },
];

/** Sounds card. Layout only — no audio in V1. Sliders start at 0 (silent). */
export function SoundsSlip() {
  return (
    <section className={styles.toolCard} aria-labelledby="tool-sounds">
      <h2 id="tool-sounds" className={styles.toolTitle}>
        <SoundsIcon /> Sounds
      </h2>

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
    </section>
  );
}
