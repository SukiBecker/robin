import type { ReactNode } from "react";
import { Button, IconButton } from "@/components/button";
import styles from "./components.module.css";

type Variant = "primary" | "secondary" | "tonal" | "locked";
type Size = "md" | "sm";

const VARIANTS: { variant: Variant; hover: string }[] = [
  { variant: "primary", hover: "kein Hover-Wechsel, nur Press" },
  { variant: "secondary", hover: "kein Hover-Wechsel, nur Press" },
  { variant: "tonal", hover: "wird zum Primär-Look" },
  { variant: "locked", hover: "keiner, immer gesperrt" },
];

const SIZES: Size[] = ["md", "sm"];

const STATES = ["Normal", "Hover (live)", "Fokussiert", "Loading", "Disabled"] as const;

/** Catalog sections — add new building blocks here. */
const SECTIONS = [
  { id: "buttons", title: "Buttons" },
  { id: "icon-buttons", title: "Icon-Buttons" },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className={styles.sectionTitle}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Dev-only component catalog: every building block in every state.
    "Fokussiert" is a static preview (styles.forceFocus mirrors the
    :focus-visible ring) — Tab through the "Normal" column for the real one. */
export default function DevComponentsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Bausteine</h1>
        <nav aria-label="Abschnitte" className={styles.toc}>
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`}>
              {s.title}
            </a>
          ))}
        </nav>
      </header>

      <Section id="buttons" title="Buttons">
        <div className={styles.tableWrap}>
          <table className={styles.matrix}>
            <thead>
              <tr>
                <th scope="col">Variante</th>
                {STATES.map((s) => (
                  <th key={s} scope="col">
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VARIANTS.flatMap(({ variant, hover }) =>
                SIZES.map((size) => {
                  const common = { variant, size } as const;
                  const disabled = variant === "locked";
                  return (
                    <tr key={`${variant}-${size}`}>
                      <th scope="row">
                        {variant}
                        <span className={styles.meta}>{size}</span>
                        <span className={styles.hint}>Hover: {hover}</span>
                      </th>
                      <td>
                        <Button {...common} disabled={disabled}>
                          Weiter
                        </Button>
                      </td>
                      <td>
                        <Button {...common} disabled={disabled}>
                          Weiter
                        </Button>
                      </td>
                      <td>
                        <Button {...common} disabled={disabled} className={styles.forceFocus} tabIndex={-1}>
                          Weiter
                        </Button>
                      </td>
                      <td>
                        <Button {...common} loading>
                          Weiter
                        </Button>
                      </td>
                      <td>
                        <Button {...common} disabled>
                          Weiter
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className={styles.note}>
          Loading behält die Breite des Labels; bei reduzierter Bewegung pulsiert der Spinner statt
          sich zu drehen.
        </p>
      </Section>

      <Section id="icon-buttons" title="Icon-Buttons">
        <div className={styles.tableWrap}>
          <table className={styles.matrix}>
            <thead>
              <tr>
                <th scope="col">Variante</th>
                <th scope="col">Normal</th>
                <th scope="col">Hover (live)</th>
                <th scope="col">Fokussiert</th>
                <th scope="col">Disabled</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  neutral
                  <span className={styles.hint}>Hover: grüner Rand</span>
                </th>
                <td>
                  <IconButton aria-label="Zurück">
                    <BackIcon />
                  </IconButton>
                </td>
                <td>
                  <IconButton aria-label="Zurück">
                    <BackIcon />
                  </IconButton>
                </td>
                <td>
                  <IconButton aria-label="Zurück" className={styles.forceFocusRound} tabIndex={-1}>
                    <BackIcon />
                  </IconButton>
                </td>
                <td>
                  <IconButton aria-label="Zurück" disabled>
                    <BackIcon />
                  </IconButton>
                </td>
              </tr>
              <tr>
                <th scope="row">
                  primary
                  <span className={styles.hint}>Hover: kein Wechsel, nur Press</span>
                </th>
                <td>
                  <IconButton variant="primary" aria-label="Hinzufügen">
                    <PlusIcon />
                  </IconButton>
                </td>
                <td>
                  <IconButton variant="primary" aria-label="Hinzufügen">
                    <PlusIcon />
                  </IconButton>
                </td>
                <td>
                  <IconButton
                    variant="primary"
                    aria-label="Hinzufügen"
                    className={styles.forceFocusRound}
                    tabIndex={-1}
                  >
                    <PlusIcon />
                  </IconButton>
                </td>
                <td>
                  <IconButton variant="primary" aria-label="Hinzufügen" disabled>
                    <PlusIcon />
                  </IconButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>
    </main>
  );
}
