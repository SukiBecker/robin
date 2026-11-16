import { PaperPanel } from "@/components/journal/paper-panel";
import styles from "./components.module.css";

/* D1: every PaperPanel option, rendered in the section's stage (on the
   garden in Studyroom mode). Props are written on the paper itself. */

/* A div, not a <p>: it's a label, not a paragraph of the note. */
function Meta({ children }: { children: string }) {
  return <div className={styles.panelMeta}>{children}</div>;
}

function Body() {
  return <p>Roses planted by the fountain.</p>;
}

export function PaperPanelPlate() {
  return (
    <p className={styles.note}>
      Rows in the stage below: variants · tape · padding · tilt · notebook (lined with heading) ·
      as=&quot;section&quot; with heading · lined without heading · long text at 240 px · widths 240 px and
      1000 px (lined, corners; wide panels tilt at most 1°). Each panel names its
      props on the paper.
    </p>
  );
}

export function PaperPanelStage() {
  return (
    <div className={styles.panelRows}>
      <div className={styles.panelRow}>
        {(["plain", "lined", "grid"] as const).map((v) => (
          <PaperPanel key={v} variant={v} className={styles.demoPanel}>
            <Meta>{`variant="${v}"`}</Meta>
            <Body />
          </PaperPanel>
        ))}
      </div>

      <div className={styles.panelRow}>
        {(["none", "top", "corners"] as const).map((t) => (
          <PaperPanel key={t} tape={t} className={styles.demoPanel}>
            <Meta>{`tape="${t}"`}</Meta>
            <Body />
          </PaperPanel>
        ))}
      </div>

      <div className={styles.panelRow}>
        {(["sm", "md", "lg"] as const).map((p) => (
          <PaperPanel key={p} padding={p} className={styles.demoPanel}>
            <Meta>{`padding="${p}"`}</Meta>
            <Body />
          </PaperPanel>
        ))}
      </div>

      <div className={styles.panelRow}>
        {[-1.5, 0, 1.5].map((t) => (
          <PaperPanel key={t} tilt={t} tape="top" className={styles.demoPanel}>
            <Meta>{`tilt={${t}}`}</Meta>
            <Body />
          </PaperPanel>
        ))}
      </div>

      <div className={styles.panelRow}>
        <PaperPanel variant="lined" tape="top" tilt={-1} padding="lg" className={styles.demoNotebook}>
          <h3 className={styles.demoHeading}>The Garden · week 46</h3>
          <p>Monday: planted the first roses.</p>
          <p>Wednesday: three sessions, lavender sprouted.</p>
          <p className={styles.demoMuted}>Friday: watered everything, 45 min.</p>
        </PaperPanel>
      </div>

      {/* Interface + lined edge cases (review D1, round 2) */}
      <div className={styles.panelRow}>
        <PaperPanel
          as="section"
          aria-labelledby="paper-demo-section"
          data-demo="section"
          variant="lined"
          padding="lg"
          className={styles.demoNotebook}
        >
          <h3 id="paper-demo-section" className={styles.demoHeading}>
            Heading first
          </h3>
          <p>as=&quot;section&quot; · aria-labelledby · data-demo. No empty rule above the heading, one between all blocks.</p>
          <p>A second paragraph, one rule further down.</p>
        </PaperPanel>
        <PaperPanel variant="lined" padding="lg" className={styles.demoNotebook}>
          <p>Lined without a heading: the first line sits on the first rule.</p>
          <p>Second paragraph, one rule further down.</p>
          <p className={styles.demoMuted}>Third, muted ink.</p>
        </PaperPanel>
      </div>

      <div className={styles.panelRow}>
        <PaperPanel padding="sm" className={`${styles.demoPanel} ${styles.demoW240}`}>
          <Meta>240 px · plain · long text</Meta>
          <p>
            Wednesday: three sessions by the fountain, the lavender finally sprouted and the
            roses along the old wall opened their first buds. Unbreakable words like
            Rhododendronblütenblatt must wrap, too.
          </p>
        </PaperPanel>
        <PaperPanel variant="lined" padding="sm" className={`${styles.demoPanel} ${styles.demoW240}`}>
          <Meta>240 px · lined · long text</Meta>
          <p>
            Wednesday: three sessions by the fountain, the lavender finally sprouted and the
            roses along the old wall opened their first buds.
          </p>
        </PaperPanel>
      </div>

      <div className={styles.panelRow}>
        <PaperPanel tape="corners" padding="sm" className={`${styles.demoPanel} ${styles.demoFull}`}>
          <Meta>full width · corners · sm</Meta>
          <p>Roses planted by the fountain. A long first line runs right into both corners.</p>
        </PaperPanel>
      </div>

      <div className={styles.panelRow}>
        <PaperPanel
          variant="lined"
          tape="corners"
          tilt={1.5}
          padding="sm"
          className={`${styles.demoPanel} ${styles.demoW240}`}
        >
          <Meta>240 px · lined · corners · tilt 1.5</Meta>
          <p>Roses planted by the fountain. Three sessions this week.</p>
        </PaperPanel>
      </div>

      <div className={styles.panelRow}>
        <PaperPanel
          variant="lined"
          tape="corners"
          tilt={1}
          padding="lg"
          className={`${styles.demoPanel} ${styles.demoW1000}`}
        >
          <Meta>1000 px · lined · corners · tilt 1 (max for wide panels)</Meta>
          <p>Roses planted by the fountain. Three sessions this week, the lavender sprouted.</p>
        </PaperPanel>
      </div>
    </div>
  );
}
