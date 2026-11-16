import { PaperPanel } from "@/components/journal/paper-panel";
import { RobinNote } from "@/components/journal/robin-note";
import styles from "./components.module.css";

/* D3: every RobinNote option. In the app there is at most ONE RobinNote per
   screen — this page breaks that rule on purpose to show all variants.
   surface="paper" only ever inside a PaperPanel; surface="slip" sits
   directly on the stage (the garden in Studyroom mode). */

export function RobinNotePlate() {
  return (
    <p className={styles.note}>
      Robin writes in fountain-pen blue and signs “— R.” with two footprints. The Robin picture
      (mood) is only for special moments and replaces the footprints. Rows below: on paper in a
      PaperPanel · arrows · slips directly on the stage (switch the background to Studyroom) · a
      long note at 240 px. In the app: one note per screen, never on buttons, prices or numbers.
    </p>
  );
}

function RowMeta({ children }: { children: string }) {
  return <p className={styles.labelRowMeta}>{children}</p>;
}

export function RobinNoteStage() {
  return (
    <div className={styles.panelRows}>
      <div className={styles.labelRow}>
        <RowMeta>surface=&quot;paper&quot; in a PaperPanel · lined / plain · with mood (special moments)</RowMeta>
        <div className={styles.panelRow}>
          <PaperPanel variant="lined" className={styles.demoNotebook}>
            <h3 className={styles.demoHeading}>This week</h3>
            <RobinNote>Nothing planted yet. Shall we start with a seed?</RobinNote>
          </PaperPanel>
          <PaperPanel className={styles.demoNotebook}>
            <RobinNote mood="neutral">Welcome to the garden. I’ll keep the journal for us.</RobinNote>
            <RobinNote mood="happy">First bloom! Pressed it for you.</RobinNote>
            <RobinNote mood="sad">The streak slipped. We can start again today.</RobinNote>
          </PaperPanel>
        </div>
      </div>

      <div className={styles.labelRow}>
        <RowMeta>arrow up · down · left · right on paper (reaches past the text at the last line)</RowMeta>
        <div className={styles.panelRow}>
          <PaperPanel className={styles.demoPanel}>
            <RobinNote arrow="up">Your seeds are up here.</RobinNote>
            <RobinNote arrow="down">Start a session below.</RobinNote>
          </PaperPanel>
          <PaperPanel className={styles.demoPanel}>
            <RobinNote arrow="left">That one needs water.</RobinNote>
            <RobinNote arrow="right">Try the lavender next.</RobinNote>
          </PaperPanel>
        </div>
      </div>

      <div className={styles.labelRow}>
        <RowMeta>surface=&quot;slip&quot; directly on the stage · arrows · mood</RowMeta>
        <div className={styles.noteGroup}>
          <RobinNote surface="slip">Lovely quiet hour. The roses noticed.</RobinNote>
          <RobinNote surface="slip" arrow="right">
            Your timer is over here.
          </RobinNote>
          <RobinNote surface="slip" arrow="down">
            Pick a seed below.
          </RobinNote>
          <RobinNote as="div" surface="slip" arrow="up">
            Your garden is up there.
          </RobinNote>
          <RobinNote surface="slip" arrow="left">
            Nothing growing yet.
          </RobinNote>
          <RobinNote surface="slip" mood="happy">
            First bloom! Pressed it for you.
          </RobinNote>
          <RobinNote surface="slip" mood="neutral" arrow="left">
            Level 10! The beach is open.
          </RobinNote>
        </div>
      </div>

      <div className={styles.labelRow}>
        <RowMeta>long note at 240 px · slip + mood + arrow right</RowMeta>
        <div className={styles.labelNarrow}>
          <RobinNote surface="slip" mood="happy" arrow="right">
            Three hours this week. The lavender grew taller than the fence!
          </RobinNote>
        </div>
      </div>
    </div>
  );
}
