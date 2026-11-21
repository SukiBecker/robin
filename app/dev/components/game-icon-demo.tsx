import { GAME_ICON_NAMES, GameIcon } from "@/components/journal/game-icon";
import { InkArrow } from "@/components/journal/ink";
import { PaperPanel } from "@/components/journal/paper-panel";
import styles from "./components.module.css";

/* D7: every icon in 16 / 24 / 48 px. every icon has its asset. Left: on paper. Right: straight on the
   stage (the garden when the background is switched to Studyroom). */

const SIZES = [16, 24, 48] as const;

export function GameIconPlate() {
  return (
    <p className={styles.note}>
      Own icons in the asset style, no Lucide. Final: <code>coin</code>, <code>xp</code> (seed),{" "}
      <code>streak</code> (sun), <code>freezer</code> (feather), <code>studyroom</code> (pocket
      watch), <code>garden</code> (watering can), <code>nursery</code> (seed bag),{" "}
      <code>journal</code> (leather book), <code>herbarium</code> (pressed-flower card, no page yet),{" "}
      <code>settings</code> (pruning shears). Icons are decorative (hidden from screen readers)
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
      <PaperPanel padding="md" className={styles.iconPanel}>
        {/* InkArrow (ink.tsx): the drawn arrow between steps, e.g. the
            Study → Earn → Grow row on Sign-up. Default --ink-line. */}
        <p className={styles.labelRowMeta}>InkArrow · 2.5rem (default) · 1.25rem · --ink-fine / --ink-stroke</p>
        <div className={styles.labelGroup}>
          <GameIcon name="studyroom" size={24} />
          <InkArrow />
          <GameIcon name="xp" size={24} />
          <InkArrow />
          <GameIcon name="coin" size={24} />
        </div>
        <div className={styles.labelGroup}>
          <InkArrow className={styles.inkArrowSmall} />
          <InkArrow className={styles.inkArrowFine} />
          <InkArrow className={styles.inkArrowStroke} />
        </div>
      </PaperPanel>
    </div>
  );
}
