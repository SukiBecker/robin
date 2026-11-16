import Image from "next/image";
import { Button } from "@/components/journal/button";
import { PaperPanel } from "@/components/journal/paper-panel";
import styles from "./components.module.css";

/* D5: Button. primary (wooden sign) sits on the stage — on the garden in
   Studyroom mode. secondary and quiet have no surface of their own, so
   they only appear on paper (PaperPanel below). */

function Feather() {
  return <Image src="/ui/icon-freezer.webp" alt="" width={40} height={40} sizes="24px" />;
}

function RowMeta({ children }: { children: string }) {
  return <p className={styles.labelRowMeta}>{children}</p>;
}

export function ButtonPlate() {
  return (
    <p className={styles.note}>
      Hover with the mouse, press to see it sink in, and press <kbd>Tab</kbd> to see the focus
      frame. First rows: primary (wooden sign) on the stage. Paper panel: all three variants —
      secondary and quiet only ever on paper.
    </p>
  );
}

export function ButtonStage() {
  return (
    <div className={styles.panelRows}>
      <div className={styles.labelRow}>
        <RowMeta>primary · md · lg · icon · long label</RowMeta>
        <div className={styles.labelGroup}>
          <Button>Start session</Button>
          <Button size="lg">Start session</Button>
          <Button icon={<Feather />}>Use a freezer</Button>
          <Button size="lg">Plant the rose by the fountain</Button>
        </div>
      </div>

      <div className={styles.labelRow}>
        <RowMeta>primary · short · disabled · loading · as link (a)</RowMeta>
        <div className={styles.labelGroup}>
          <Button>Buy</Button>
          <Button disabled>Start session</Button>
          <Button loading>Start session</Button>
          <Button href="#button">Open the Journal</Button>
        </div>
      </div>

      <div className={styles.labelRow}>
        <RowMeta>on paper · primary · secondary · quiet</RowMeta>
        <PaperPanel padding="sm" className={styles.demoPanel}>
          <div className={styles.labelGroup}>
            <Button>Save</Button>
            <Button variant="secondary">Cancel</Button>
            <Button variant="quiet">Reset timer</Button>
          </div>
          <div className={styles.labelGroup}>
            <Button size="lg">Save</Button>
            <Button size="lg" variant="secondary">
              Cancel
            </Button>
            <Button size="lg" variant="quiet">
              Reset timer
            </Button>
          </div>
          <div className={styles.labelGroup}>
            <Button icon={<Feather />}>Use a freezer</Button>
            <Button variant="secondary" icon={<Feather />}>
              Use a freezer
            </Button>
            <Button variant="quiet" href="#button">
              View all plants
            </Button>
          </div>
          <div className={styles.labelGroup}>
            <Button disabled>Save</Button>
            <Button variant="secondary" disabled>
              Cancel
            </Button>
            <Button variant="quiet" disabled>
              Reset timer
            </Button>
          </div>
          <div className={styles.labelGroup}>
            <Button loading>Save</Button>
            <Button variant="secondary" loading>
              Cancel
            </Button>
            <Button variant="quiet" loading>
              Reset timer
            </Button>
          </div>
        </PaperPanel>
      </div>
    </div>
  );
}
