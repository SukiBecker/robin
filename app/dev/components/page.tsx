import { BackgroundStage } from "./background-stage";
import styles from "./components.module.css";

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

/** Dev-only test page for the journal building blocks. The old catalog
    lives at /dev/legacy. Production 404 comes from app/dev/layout.tsx. */
export default function DevComponentsPage() {
  return (
    <BackgroundStage
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
          <h2 id={`${s.id}-title`} className={styles.sectionTitle}>
            {s.title}
          </h2>
          <p className={styles.empty}>Nothing here yet.</p>
        </section>
      ))}
    </BackgroundStage>
  );
}
