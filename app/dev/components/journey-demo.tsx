import { LuggageTag } from "@/components/journal/luggage-tag";
import { PaperPanel } from "@/components/journal/paper-panel";
import { PostageStamp } from "@/components/journal/postage-stamp";
import styles from "./components.module.css";

/* Phase 4: the journey pieces of the Journal page. Both are placeholders
   (CSS material) until their painted assets exist; the props stay. */

function RowMeta({ children }: { children: string }) {
  return <p className={styles.labelRowMeta}>{children}</p>;
}

export function JourneyPlate() {
  return (
    <p className={styles.note}>
      PostageStamp: one stamp per place. Reached places are stuck in with tape (“est. Sep 2026”, value =
      unlock level); places not reached yet are a pencil outline, “Not yet issued”. LuggageTag: the next
      stop with the XP still to go. Both sit on paper only. Placeholder material, painted assets later.
    </p>
  );
}

export function JourneyStage() {
  return (
    <div className={styles.panelRows}>
      <div className={styles.labelRow}>
        <RowMeta>PostageStamp · issued (green, rust) · not yet issued</RowMeta>
        <PaperPanel className={styles.demoPanel}>
          <div className={styles.journeyRow}>
            <PostageStamp
              place="The Garden"
              unlockLevel={1}
              establishedAt="2026-09-03T10:00:00Z"
              motif="/garden/items/rose-3.png"
            />
            <PostageStamp
              place="Beach"
              unlockLevel={10}
              establishedAt="2026-11-12T10:00:00Z"
              motif="/garden/items/lavender-3.png"
              color="rust"
              tilt={-2}
            />
            <PostageStamp place="Mountains" unlockLevel={20} />
            <PostageStamp place="Japanese Garden" unlockLevel={60} />
          </div>
        </PaperPanel>
      </div>

      <div className={styles.labelRow}>
        <RowMeta>LuggageTag · next stop · last stretch · all places reached</RowMeta>
        <PaperPanel className={styles.demoPanel}>
          <div className={styles.journeyRow}>
            <LuggageTag destination="Beach" unlockLevel={10} xpToGo={1240} />
            <LuggageTag destination="Japanese Garden" unlockLevel={60} xpToGo={35} tilt={1} />
            <LuggageTag arrived tilt={0} />
          </div>
        </PaperPanel>
      </div>
    </div>
  );
}
