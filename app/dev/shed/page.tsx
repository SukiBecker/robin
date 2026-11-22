/* eslint-disable @next/next/no-img-element -- static placeholder garden */
import { Button } from "@/components/journal/button";
import { Checkbox } from "@/components/journal/checkbox";
import { PaperPanel } from "@/components/journal/paper-panel";
import { TabularNumber } from "@/components/journal/tabular-number";
import { RobinPerch } from "@/components/nursery/robin-perch";
import { PlaceBackdrop } from "@/components/place/place-backdrop";
import { Nail } from "@/components/studyroom/nail";
import studyroom from "@/components/studyroom/studyroom.module.css";
import styles from "./shed.module.css";

/** Placeholder garden in the window: lawn tile + a few items. No logic. */
const GARDEN_ITEMS = [
  { src: "/garden/items/fountain.png", left: "44%", top: "30%", w: "15%" },
  { src: "/garden/items/hedge-2.png", left: "10%", top: "18%", w: "16%" },
  { src: "/garden/items/busch-2.png", left: "24%", top: "52%", w: "8%" },
  { src: "/garden/items/lavender-3.png", left: "68%", top: "56%", w: "9%" },
  { src: "/garden/items/daisy-3.png", left: "78%", top: "24%", w: "7%" },
];

/**
 * Static mock of the Studyroom in the shed (docs/studyroom-schuppen-plan.md
 * §5a). Composition only: placeholders, no timer, no data. The real
 * /studyroom stays untouched until this is approved.
 */
export default function ShedMockPage() {
  return (
    <PlaceBackdrop world="garden" className={`${styles.room} room-viewport`}>
      <h1 className={styles.srOnly}>Studyroom (shed mock)</h1>

      <div className={styles.wall}>
        <div className={styles.windowArea}>
          <div className={styles.window}>
            <div className={styles.garden} aria-hidden="true">
              {GARDEN_ITEMS.map((item) => (
                <img
                  key={item.src}
                  src={item.src}
                  alt=""
                  className={styles.gardenItem}
                  style={{ left: item.left, top: item.top, width: item.w }}
                />
              ))}
            </div>
            {/* Vine placeholder: up the left post, then along the top rail. */}
            <span className={styles.vineLeft} aria-hidden="true" />
            <span className={styles.vineTop} aria-hidden="true" />
          </div>
          <div className={styles.sill} aria-hidden="true">
            <RobinPerch mood="neutral" className={styles.robin} />
          </div>
        </div>

        <div className={styles.shelf}>
          <div className={styles.things}>
            <section
              className={`${styles.thing} ${styles.slate}`}
              data-surface="slate"
              aria-label="Timer"
            >
              <div className={studyroom.boardFrame}>
                <div className={`${studyroom.boardFace} ${styles.slateFace}`}>
                  <p className={styles.time}>
                    <TabularNumber>25:00</TabularNumber>
                  </p>
                  <p className={styles.mode}>
                    <span className={styles.nowrap}>
                      <span className={styles.modeOn}>25/5</span> · 50/10 ·
                    </span>{" "}
                    Custom
                  </p>
                  <p className={styles.rounds}>Rounds 1</p>
                </div>
              </div>
            </section>
            <div className={`${styles.thing} ${styles.sign}`}>
              <Button variant="primary" type="button">
                Start session
              </Button>
            </div>
          </div>
          <span className={styles.plank} aria-hidden="true" />
        </div>

        <div className={styles.todo}>
          <PaperPanel variant="lined" padding="md" tilt={1.5} className={styles.todoPaper}>
            <p className={styles.todoTitle}>To-do</p>
            <Checkbox strike>Read chapter 4</Checkbox>
            <Checkbox strike defaultChecked>
              Flashcards, set 2
            </Checkbox>
            <Checkbox strike>Outline the essay</Checkbox>
          </PaperPanel>
          <Nail className={styles.todoNail} />
        </div>
      </div>
    </PlaceBackdrop>
  );
}
