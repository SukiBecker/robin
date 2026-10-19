import type { ReactNode } from "react";
import { Button, IconButton } from "@/components/button";
import { TextField } from "@/components/text-field";
import { Alert } from "@/components/alert";
import { Card } from "@/components/card";
import { AutoHideDemo, SavedDemo } from "./alert-demos";
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
  { id: "text-fields", title: "Text fields" },
  { id: "alerts", title: "Alerts" },
  { id: "cards", title: "Cards" },
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

      <Section id="text-fields" title="Text fields">
        <div className={styles.fieldGrid}>
          <div className={styles.fieldCell}>
            <span className={styles.meta}>Leer</span>
            <TextField label="Display name" />
          </div>
          <div className={styles.fieldCell}>
            <span className={styles.meta}>Placeholder</span>
            <TextField label="Email" type="email" placeholder="you@example.com" />
          </div>
          <div className={styles.fieldCell}>
            <span className={styles.meta}>Hilfetext</span>
            <TextField label="Display name" helpText="This is how Robin will greet you." />
          </div>
          <div className={styles.fieldCell}>
            <span className={styles.meta}>Fehler</span>
            <TextField
              label="Email"
              type="email"
              defaultValue="robin@garden"
              helpText="Wird vom Fehler ersetzt."
              error="That doesn't look like a valid email."
            />
          </div>
          <div className={styles.fieldCell}>
            <span className={styles.meta}>Fokussiert (statisch)</span>
            <TextField
              label="Email"
              type="email"
              defaultValue="robin@example.com"
              className={styles.forceFocusField}
              tabIndex={-1}
            />
          </div>
          <div className={styles.fieldCell}>
            <span className={styles.meta}>Deaktiviert</span>
            <TextField label="Display name" defaultValue="Robin" disabled />
          </div>
          <div className={styles.fieldCell}>
            <span className={styles.meta}>Passwort</span>
            <TextField
              label="Password"
              type="password"
              defaultValue="sunflower42"
              helpText="At least 6 characters."
              autoComplete="off"
            />
          </div>
        </div>
        <p className={styles.note}>
          Echter Fokus per Tab. Das Auge schaltet die Anzeige um, ohne dass Fokus oder Cursor das
          Feld verlassen.
        </p>
      </Section>

      <Section id="alerts" title="Alerts">
        <div className={styles.alertGrid}>
          <div className={styles.fieldCell}>
            <span className={styles.meta}>error · role=&quot;alert&quot;</span>
            <Alert variant="error">Email or password is incorrect.</Alert>
          </div>
          <div className={styles.fieldCell}>
            <span className={styles.meta}>success · role=&quot;status&quot;</span>
            <Alert variant="success">Your new password is active.</Alert>
          </div>
          <div className={styles.fieldCell}>
            <span className={styles.meta}>info · role=&quot;status&quot;</span>
            <Alert variant="info">Your streak counts once you&apos;ve studied 15 minutes today.</Alert>
          </div>
          <div className={styles.fieldCell}>
            <span className={styles.meta}>error mit action</span>
            <Alert
              variant="error"
              action={
                <Button size="sm" variant="secondary">
                  Try again
                </Button>
              }
            >
              Couldn&apos;t reach Robin. Check your connection.
            </Alert>
          </div>
          <div className={styles.fieldCell}>
            <span className={styles.meta}>compact · success, autoHideMs 3000</span>
            <SavedDemo />
          </div>
          <div className={styles.fieldCell}>
            <span className={styles.meta}>autoHideMs 3000 · Box</span>
            <AutoHideDemo />
          </div>
        </div>
        <p className={styles.note}>
          Ausblenden in 200 ms, bei reduzierter Bewegung sofort. success/info halten ohne Text eine
          leere Status-Region bereit, damit Screenreader die Meldung ansagen.
        </p>
      </Section>

      <Section id="cards" title="Cards">
        <div className={styles.cardStage}>
          <div className={styles.cardRow}>
            <div className={styles.fieldCell}>
              <span className={styles.meta}>sm · mit label (Statistics)</span>
              <Card padding="sm" label="Today">
                <span className={styles.statValue}>1 h 25 min</span>
              </Card>
            </div>
            <div className={styles.fieldCell}>
              <span className={styles.meta}>sm · ohne label</span>
              <Card padding="sm">
                <p className={styles.cardText}>Kompakte Kachel, 28 px rundum.</p>
              </Card>
            </div>
          </div>
          <div className={styles.cardRow}>
            <div className={styles.fieldCell}>
              <span className={styles.meta}>md · mit label</span>
              <Card label="Profile">
                <p className={styles.cardText}>40 px oben, 28 px seitlich und unten.</p>
              </Card>
            </div>
            <div className={styles.fieldCell}>
              <span className={styles.meta}>lg · ohne label (Auth)</span>
              <Card padding="lg">
                <p className={styles.cardText}>48 px oben, Platz für Robins Sitzplatz.</p>
              </Card>
            </div>
          </div>
          <div className={styles.fieldCell}>
            <span className={styles.meta}>md · Card.Section + Card.Divider (Settings)</span>
            <Card as="section" className={styles.cardNarrow}>
              <Card.Section label="Profile">
                <TextField label="Display name" defaultValue="Robin" />
                <div>
                  <Button size="sm">Save</Button>
                </div>
              </Card.Section>
              <Card.Divider />
              <Card.Section label="Account">
                <div>
                  <Button size="sm" variant="secondary">
                    Sign out
                  </Button>
                </div>
              </Card.Section>
            </Card>
          </div>
        </div>
      </Section>
    </main>
  );
}
