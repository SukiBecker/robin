import { Checkbox } from "@/components/journal/checkbox";
import { ChoiceGroup, type ChoiceOption } from "@/components/journal/choice-group";
import { PaperPanel } from "@/components/journal/paper-panel";
import { Slider } from "@/components/journal/slider";
import { TextInput } from "@/components/journal/text-input";
import styles from "./components.module.css";

/* D8: input fields. They always stand on paper (To-dos in the Studyroom,
   Settings, Sign-in), so every example sits on one PaperPanel. */

const TIMER_OPTIONS: ChoiceOption[] = [
  { value: "25-5", label: "25/5", srLabel: "25 minutes focus, 5 minutes break" },
  { value: "50-10", label: "50/10", srLabel: "50 minutes focus, 10 minutes break" },
  { value: "flex", label: "Flexible" },
];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.inputGroup}>
      <p className={styles.inputGroupMeta}>{title}</p>
      {children}
    </div>
  );
}

export function InputsPlate() {
  return (
    <p className={styles.note}>
      Press <kbd>Tab</kbd> through the panel: Space ticks a box, arrow keys move the slider and
      the timer choice. Slider handle: pebble is the default, ink blot an option.
    </p>
  );
}

export function InputsStage() {
  return (
    <div className={styles.panelRows}>
      <PaperPanel padding="md" tape="corners" className={styles.inputsPanel}>
        <div className={styles.inputsGrid}>
          <Group title="Checkbox · to-dos">
            <div>
              <Checkbox strike>Read chapter 3 on cell division</Checkbox>
              <Checkbox strike defaultChecked>
                Flashcards: twenty minutes
              </Checkbox>
              <Checkbox strike defaultChecked disabled>
                Hand in the lab report (disabled, done)
              </Checkbox>
              <Checkbox disabled>Sync with calendar (disabled)</Checkbox>
              <Checkbox>Remember me on this device</Checkbox>
            </div>
          </Group>

          <Group title="TextInput · settings, sign-in">
            <div className={styles.inputStack}>
              <TextInput label="Display name" defaultValue="Suki" autoComplete="nickname" />
              <TextInput
                label="Email"
                type="email"
                placeholder="you@example.com"
                hint="We only use it to sign you in."
                autoComplete="email"
              />
              <TextInput
                label="Password"
                type="password"
                defaultValue="short"
                error="Use at least 8 characters."
                autoComplete="new-password"
              />
              <TextInput label="Garden name" defaultValue="The Garden" disabled />
            </div>
          </Group>

          <Group title="Slider · sounds">
            <div className={styles.inputStack}>
              <Slider label="Rain · ink blot (option)" thumb="ink" defaultValue={60} step={5} unit=" %" />
              <Slider label="Birdsong · pebble (default)" defaultValue={35} step={5} unit=" %" />
              <Slider label="Fountain (disabled)" thumb="ink" defaultValue={20} disabled unit=" %" />
              <Slider label="Wind (disabled)" thumb="pebble" defaultValue={80} disabled unit=" %" />
            </div>
          </Group>

          <Group title="ChoiceGroup · timer">
            <div className={styles.inputStack}>
              <ChoiceGroup legend="Timer" options={TIMER_OPTIONS} defaultValue="25-5" />
              <ChoiceGroup
                legend="Break (None disabled)"
                options={[
                  { value: "short", label: "Short" },
                  { value: "long", label: "Long" },
                  { value: "none", label: "None", disabled: true },
                ]}
                defaultValue="long"
              />
              <ChoiceGroup legend="Timer (disabled)" options={TIMER_OPTIONS} defaultValue="50-10" disabled />
            </div>
          </Group>
        </div>
      </PaperPanel>
    </div>
  );
}
