import { BackgroundStage } from "./background-stage";
import { ColorSpecimen, MaterialSample } from "./color-specimen";
import { ButtonPlate, ButtonStage } from "./button-demo";
import { LabelPlate, LabelStage } from "./label-demo";
import { PaperPanelPlate, PaperPanelStage } from "./paper-panel-demo";
import { RobinNotePlate, RobinNoteStage } from "./robin-note-demo";
import styles from "./components.module.css";
import { fontVariables } from "./fonts";

/** One entry per building block from docs/checkliste-bausteine.md (D1–D8),
    plus the foundation (fonts, colors). Fill a section when its block exists. */
const SECTIONS = [
  { id: "fonts", title: "Fonts" },
  { id: "colors", title: "Colors" },
  { id: "paper-panel", title: "PaperPanel" },
  { id: "label", title: "Label" },
  { id: "robin-note", title: "RobinNote" },
  { id: "stamp", title: "Stamp" },
  { id: "button", title: "Button" },
  { id: "xp-ruler", title: "XpRuler" },
  { id: "game-icon", title: "GameIcon" },
  { id: "inputs", title: "Inputs" },
] as const;

/** B1: one row per font role, with the role name and font next to it. */
function FontSpecimen() {
  return (
    <ul className={styles.specimen}>
      <li className={styles.specimenRow}>
        <p className={styles.sampleHeading}>The Garden · est. Sep 2026</p>
        <span className={styles.specimenMeta}>
          <b>Display · heading</b>Fraunces 600, 32px
        </span>
      </li>
      <li className={styles.specimenRow}>
        <p className={styles.sampleBody}>
          Robin planted the first roses by the old fountain this week. Every quiet hour at your desk
          gave them a little more sun.
        </p>
        <span className={styles.specimenMeta}>
          <b>Display · body text</b>Fraunces 400, 17px
        </span>
      </li>
      <li className={styles.specimenRow}>
        <p className={styles.sampleLabel}>Studied today · 1 h 25 m</p>
        <span className={styles.specimenMeta}>
          <b>Label</b>Courier Prime 400, 16px
        </span>
      </li>
      <li className={styles.specimenRow}>
        <p className={`${styles.sampleLabel} ${styles.sampleLabelSmall}`}>Studied today · 1 h 25 m</p>
        <span className={styles.specimenMeta}>
          <b>Label · minimum</b>Courier Prime 400, 13px
        </span>
      </li>
      <li className={styles.specimenRow}>
        <p className={styles.sampleHand}>Nice work! The roses loved that session.</p>
        <span className={styles.specimenMeta}>
          <b>Hand · Robin’s voice only</b>Caveat 500, 26px
        </span>
      </li>
      <li className={styles.specimenRow}>
        <p className={`${styles.sampleNumbers} ${styles.sampleNumberDisplay}`}>
          <span>24:59</span>
          <span>1,240 XP</span>
        </p>
        <span className={styles.specimenMeta}>
          <b>Display · big numbers</b>Fraunces 600, 48px, tabular-nums
        </span>
      </li>
    </ul>
  );
}

/** Dev-only test page for the journal building blocks. The old catalog
    lives at /dev/legacy. Production 404 comes from app/dev/layout.tsx. */
export default function DevComponentsPage() {
  return (
    <BackgroundStage
      className={fontVariables}
      intro={
        <>
          <h1 className={styles.title}>Building blocks</h1>
          <nav aria-label="Sections" className={styles.toc}>
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`}>
                {s.title}
              </a>
            ))}
          </nav>
          <p className={styles.note}>
            Reduced motion: open Chrome DevTools, press <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>P</kbd>{" "}
            (<kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>P</kbd> on Windows), run “Show Rendering”, then set
            “Emulate CSS media feature prefers-reduced-motion” to “reduce”.
          </p>
        </>
      }
    >
      {SECTIONS.map((s) => (
        <section key={s.id} id={s.id} className={styles.section} aria-labelledby={`${s.id}-title`}>
          {/* plate = titles and captions (always on canvas);
              stage = the examples (transparent in Studyroom mode) */}
          <div className={styles.plate}>
            <h2 id={`${s.id}-title`} className={styles.sectionTitle}>
              {s.title}
            </h2>
            {s.id === "fonts" ? (
              <FontSpecimen />
            ) : s.id === "colors" ? (
              <ColorSpecimen />
            ) : s.id === "paper-panel" ? (
              <PaperPanelPlate />
            ) : s.id === "label" ? (
              <LabelPlate />
            ) : s.id === "robin-note" ? (
              <RobinNotePlate />
            ) : s.id === "button" ? (
              <ButtonPlate />
            ) : (
              <p className={styles.empty}>Nothing here yet.</p>
            )}
          </div>
          {s.id === "colors" && (
            <div className={styles.stage}>
              <MaterialSample />
            </div>
          )}
          {s.id === "paper-panel" && (
            <div className={styles.stage}>
              <PaperPanelStage />
            </div>
          )}
          {s.id === "label" && (
            <div className={styles.stage}>
              <LabelStage />
            </div>
          )}
          {s.id === "robin-note" && (
            <div className={styles.stage}>
              <RobinNoteStage />
            </div>
          )}
          {s.id === "button" && (
            <div className={styles.stage}>
              <ButtonStage />
            </div>
          )}
        </section>
      ))}
    </BackgroundStage>
  );
}
