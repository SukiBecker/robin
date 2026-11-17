import { LockIcon } from "@/components/lock-icon";
import { BackgroundIcon } from "./icons";
import type { World } from "./session";
import styles from "./studyroom.module.css";

// The Background card always shows the home garden as selected for now —
// actually switching the stage's world comes in V3.
const SELECTED_WORLD_SLUG = "garden";

type BackgroundSlipProps = {
  worlds: World[] | null;
  error: string | null;
  level: number | null;
};

/** Background card: display only. Locked worlds stay visible, dimmed, so
 *  there's something to look forward to. */
export function BackgroundSlip({ worlds, error, level }: BackgroundSlipProps) {
  return (
    <section className={styles.toolCard} aria-labelledby="tool-background">
      <h2 id="tool-background" className={styles.toolTitle}>
        <BackgroundIcon /> Background
      </h2>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {!worlds && !error && <p className={styles.body}>Loading…</p>}

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
    </section>
  );
}
