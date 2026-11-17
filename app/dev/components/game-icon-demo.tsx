import { GAME_ICON_NAMES, GameIcon } from "@/components/journal/game-icon";
import { PaperPanel } from "@/components/journal/paper-panel";
import styles from "./components.module.css";

/* D7: every icon in 16 / 24 / 48 px. six icons have their asset;
   the others are placeholders (dashed square with the initial) until
   their icon is generated. Left: on paper. Right: straight on the
   stage (the garden when the background is switched to Studyroom). */

const SIZES = [16, 24, 48] as const;

export function GameIconPlate() {
  return (
    <p className={styles.note}>
      Own icons in the asset style, no Lucide. Final: <code>coin</code>, <code>xp</code> (seed),{" "}
      <code>streak</code> (sun), <code>freezer</code> (feather), <code>studyroom</code> (pocket
      watch), <code>garden</code> (watering can). <code>nursery</code>, <code>journal</code>,{" "}
      <code>herbarium</code> and <code>settings</code> are placeholders until they are generated. Icons are decorative (hidden from screen readers)
      unless an <code>alt</code> is passed; the number or label next to them does the talking.
      Sizes are set in rem. Left: on paper · right: directly on the stage (switch the background to
      Studyroom for the garden).
    </p>
  );
}

/* names only on paper: text never sits straight on the garden */
function IconTable({ names }: { names: boolean }) {
  return (
    <ul className={styles.iconTable}>
      {GAME_ICON_NAMES.map((name) => (
        <li key={name} className={styles.iconRow} data-names={names}>
          {names && <span className={styles.iconName}>{name}</span>}
          {SIZES.map((s) => (
            <GameIcon key={s} name={name} size={s} />
          ))}
        </li>
      ))}
    </ul>
  );
}

export function GameIconStage() {
  return (
    <div className={styles.panelRow}>
      <PaperPanel padding="md" className={styles.iconPanel}>
        <IconTable names />
      </PaperPanel>
      <div className={styles.iconOnStage}>
        <IconTable names={false} />
      </div>
    </div>
  );
}
