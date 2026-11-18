import { ChoiceGroup } from "@/components/journal/choice-group";
import { Slider } from "@/components/journal/slider";
import { useBackgroundWorld } from "@/lib/studyroom/use-background-world";
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

type AmbienceCrateProps = {
  worlds: World[] | null;
  worldsError: string | null;
  level: number | null;
};

/** Ambience: a flat wooden crate on the potting bench holding what you
    hear (sounds) and where you are (place). Its name is burnt into the
    front board. The heading comes first in the DOM (screen readers meet it
    before the controls); CSS moves it to the front, below the inside. */
export function AmbienceCrate({ worlds, worldsError, level }: AmbienceCrateProps) {
  const { worldId, loaded, error: settingsError, select } = useBackgroundWorld();

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
            srLabel: locked ? `${name}, unlocks at level ${world.unlock_level}` : name,
            disabled: locked,
          };
        })
      : null;
  const firstOpen = options?.find((o) => !o.disabled)?.value;
  const stored = worldId !== null ? options?.find((o) => o.value === String(worldId)) : undefined;
  const selected = stored && !stored.disabled ? stored.value : firstOpen;

  const error = worldsError ?? settingsError;

  return (
    <section aria-labelledby="ambience-title" className={styles.crate}>
      <h2 id="ambience-title" className={styles.crateFront}>
        Ambience
      </h2>
      <div className={styles.crateInside}>
      {/* Names as text, one slider each, two columns. They start at 0
          (silent) on purpose: there is no audio yet, and nothing is stored —
          study_room_settings.sound_volumes (jsonb, default {}) stays unused
          until there is, then it supplies the start values. */}
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

      {options && loaded && selected && (
        <ChoiceGroup
          legend="Place"
          options={options}
          value={selected}
          onChange={(value) => select(Number(value))}
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
