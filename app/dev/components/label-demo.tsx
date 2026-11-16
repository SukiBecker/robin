import { Label } from "@/components/journal/label";
import { PaperPanel } from "@/components/journal/paper-panel";
import styles from "./components.module.css";

/* D2: every Label option. Tags sit directly on the stage (garden in
   Studyroom mode); inline labels only ever on paper, so they live in a
   PaperPanel. */

export function LabelPlate() {
  return (
    <p className={styles.note}>
      Rows in the stage below: tag with and without title · tilt −2 / 1 / 2 · as=&quot;div&quot;
      in a column (stays content-wide) · a long tag that wraps · inline labels on paper. Each row
      names its props.
    </p>
  );
}

function RowMeta({ children }: { children: string }) {
  return <p className={styles.labelRowMeta}>{children}</p>;
}

export function LabelStage() {
  return (
    <div className={styles.panelRows}>
      <div className={styles.labelRow}>
        <RowMeta>variant=&quot;tag&quot; · title + value · value only · children</RowMeta>
        <div className={styles.labelGroup}>
          <Label title="Studied today" value="1 h 25 m" />
          <Label value="Lavender" />
          <Label>est. Sep 2026</Label>
        </div>
      </div>

      <div className={styles.labelRow}>
        <RowMeta>tilt -2 · 1 · 2 (5 is clamped to 2)</RowMeta>
        <div className={styles.labelGroup}>
          <Label tilt={-2} title="Streak" value="12 days" />
          <Label tilt={1} value="The Garden" />
          <Label tilt={5} title="Next stop" value="Beach · level 10" />
        </div>
      </div>

      <div className={styles.labelRow}>
        <RowMeta>as=&quot;div&quot; inside a flex column — no full width</RowMeta>
        <div className={styles.labelColumn}>
          <Label as="div" title="Seeds" value="4" />
          <Label as="div" title="Grown" value="7 / 14" />
        </div>
      </div>

      <div className={styles.labelRow}>
        <RowMeta>long tag in a narrow box (wraps inside the frame)</RowMeta>
        <div className={styles.labelNarrow}>
          <Label title="You grew this rose with" value="3 hours of study in The Garden" />
        </div>
      </div>

      <div className={styles.labelRow}>
        <RowMeta>variant=&quot;inline&quot; on paper · with / without title · tilt 1</RowMeta>
        <PaperPanel padding="sm" className={styles.demoPanel}>
          <p className={styles.labelPaperLine}>
            <Label variant="inline" title="Studied today" value="1 h 25 m" />
          </p>
          <p className={styles.labelPaperLine}>
            <Label variant="inline" value="Sown 12 Nov 2026" />
          </p>
          <p className={styles.labelPaperLine}>
            <Label variant="inline" tilt={1} title="Week" value="46" />
          </p>
          <p className={styles.labelPaperLine}>
            Tag on paper: <Label title="XP" value="1,240" />
          </p>
        </PaperPanel>
      </div>
    </div>
  );
}
