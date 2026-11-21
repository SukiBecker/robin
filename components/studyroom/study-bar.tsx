"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { Button } from "@/components/journal/button";
import { ChoiceGroup } from "@/components/journal/choice-group";
import { FocusFrame, InkRule } from "@/components/journal/ink";
import { RobinNote } from "@/components/journal/robin-note";
import { TabularNumber } from "@/components/journal/tabular-number";
import { TextInput } from "@/components/journal/text-input";
import { AmbienceMixer, describeSounds } from "./ambience-crate";
import {
  CrateIcon,
  CrateLidIcon,
  NotepadIcon,
  PauseIcon,
  PlayIcon,
} from "./icons";
import { RoundsStepper } from "./rounds-stepper";
import {
  formatTime,
  POMODORO_MODES,
  type Phase,
  type PomodoroModeId,
  type World,
} from "./session";
import { TodoNote } from "./todo-note";
import styles from "./study-bar.module.css";

type PanelId = "todo" | "session" | "ambience";

type StudyBarProps = {
  phase: Phase;
  paused: boolean;
  secondsRemaining: number | null;
  /** Seconds the clock shows (the selected block length while idle). */
  displaySeconds: number;
  sessionId: string | null;
  blockIndex: number;
  totalBlocks: number;
  /** Study progress of the whole run, 0–1 (holds still in a break). */
  progress: number;

  modeId: PomodoroModeId;
  onModeChange: (modeId: PomodoroModeId) => void;
  customStudyMinutes: number;
  onCustomStudyMinutesChange: (minutes: number) => void;
  customBreakMinutes: number;
  onCustomBreakMinutesChange: (minutes: number) => void;
  repetitions: number;
  onRepetitionsChange: (repetitions: number) => void;

  loading: boolean;
  pauseToggling: boolean;
  finishing: boolean;
  onStart: () => void;
  onTogglePause: () => void;
  onFinish: () => void;
  onEndBreak: () => void;
  error: string | null;

  worlds: World[] | null;
  worldsError: string | null;
  level: number | null;

  /** Robin's line for a break (the one note of that state). */
  breakQuote: string;
  /** The run-complete content (SessionComplete), shown on a slate. */
  complete: ReactNode;
  /** Robin's note at the end of a run. */
  completeNote: string;
};

const MODE_OPTIONS = POMODORO_MODES.map((mode) => ({
  value: mode.id,
  label: mode.label,
  srLabel: mode.description,
}));

/** The bar layout of the Studyroom (dev variant, ?layout=bar): the garden
    fills the window and everything you operate is one slate bar at its
    bottom, like the toolbar of a game — dark ground, so the light wooden
    "Start session" sign stands out. Idle: To-do (chalk icon and word) on
    the left, in the middle the time in chalk (a button: it opens the
    session's mode and rounds) and the sign, Ambience on the right. Each
    toggle opens its panel above the bar — only one at a time; Escape or a
    click elsewhere closes it. Running: only the time, Pause (secondary)
    and End (quiet), in chalk. The run's progress is a chalk stroke along
    the bar's top edge. On phones the bar spans the full width and the
    panels rise as sheets from the bottom. */
export function StudyBar(props: StudyBarProps) {
  const {
    phase,
    paused,
    secondsRemaining,
    displaySeconds,
    sessionId,
    blockIndex,
    totalBlocks,
    progress,
    modeId,
    onModeChange,
    customStudyMinutes,
    onCustomStudyMinutesChange,
    customBreakMinutes,
    onCustomBreakMinutesChange,
    repetitions,
    onRepetitionsChange,
    loading,
    pauseToggling,
    finishing,
    onStart,
    onTogglePause,
    onFinish,
    onEndBreak,
    error,
    worlds,
    worldsError,
    level,
    breakQuote,
    complete,
    completeNote,
  } = props;

  const focusRunning =
    phase === "focus" && sessionId !== null && secondsRemaining !== null;
  const breakRunning = phase === "break" && secondsRemaining !== null;
  const running = focusRunning || breakRunning;
  const isComplete = phase === "complete";

  const [open, setOpen] = useState<PanelId | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const todoToggle = useRef<HTMLButtonElement>(null);
  const sessionToggle = useRef<HTMLButtonElement>(null);
  const ambienceToggle = useRef<HTMLButtonElement>(null);
  const toggles: Record<PanelId, RefObject<HTMLButtonElement | null>> = {
    todo: todoToggle,
    session: sessionToggle,
    ambience: ambienceToggle,
  };
  const ids = {
    todo: useId(),
    session: useId(),
    ambience: useId(),
  };

  // Volumes live here, so they survive closing the panel (no audio yet,
  // nothing stored — see AmbienceCrate).
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const sounds = describeSounds(volumes);

  // A session starting (or a run ending) closes whatever was open: the
  // running bar has no toggles to open from.
  useEffect(() => {
    setOpen(null);
  }, [running, isComplete]);

  // Escape closes (focus back to the toggle that opened it); a click or tap
  // outside the plank and its panel closes too.
  useEffect(() => {
    if (!open) return;
    const current = open;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(null);
      toggles[current].current?.focus();
    }
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(null);
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
    // toggles holds stable refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (panel: PanelId) =>
    setOpen((current) => (current === panel ? null : panel));

  const mode = POMODORO_MODES.find((m) => m.id === modeId);
  const modeCaption =
    modeId === "flexible"
      ? `${customStudyMinutes}/${customBreakMinutes}`
      : (mode?.label ?? "");
  const roundsCaption = repetitions > 1 ? ` · ${repetitions} rounds` : "";

  const clamped = Number.isFinite(progress)
    ? Math.min(1, Math.max(0, progress))
    : 0;
  const percent = Math.floor(clamped * 100);

  const phaseWord = paused
    ? "Paused"
    : breakRunning
      ? "Break"
      : `Round ${blockIndex}/${totalBlocks}`;

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-state={running ? "running" : "idle"}
      data-open={open ?? undefined}
    >
      {/* Robin's one note of the state, standing over the plank's left
          end: his break line, or his note when a run is done. */}
      {(breakRunning || isComplete) && (
        <div className={styles.robin}>
          {isComplete ? (
            <RobinNote surface="slip" mood="happy">
              {completeNote}
            </RobinNote>
          ) : (
            <RobinNote surface="slip">{breakQuote}</RobinNote>
          )}
        </div>
      )}

      {/* The finished run, on a framed slate above the bar. */}
      {isComplete && (
        <section
          aria-label="Session complete"
          className={`${styles.panel} ${styles.panelCenter} ${styles.slatePanel}`}
        >
          <div data-surface="slate" className={styles.slateFace}>
            {complete}
          </div>
        </section>
      )}

      {error && !isComplete && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      {/* The bar: a slate. Each panel follows its toggle in the DOM (so
          Tab goes from the toggle straight into the open panel); CSS
          places it above the bar. The chalk surface is set per control,
          not on the bar, so the paper and crate panels keep their ink. */}
      <div className={styles.plank}>
        {/* The run's progress: a chalk line along the slate's top edge —
            fine for the way to go, a firm stroke for the way done, dashed
            in a break. */}
        {running && (
          <div
            className={styles.progress}
            data-phase={breakRunning ? "break" : "focus"}
            data-paused={paused ? "" : undefined}
            style={{ "--bar-p": clamped } as CSSProperties}
            role="progressbar"
            aria-label={
              breakRunning ? "Study progress (break)" : "Study progress"
            }
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-valuetext={`${percent} %${breakRunning ? ", break" : ""}${paused ? ", paused" : ""}`}
          >
            <InkRule className={styles.progressLine} />
            <InkRule className={styles.progressDone} />
          </div>
        )}

        {!running && (
          <>
            <button
              ref={todoToggle}
              type="button"
              data-surface="slate"
              className={`${styles.tool} ${styles.toolStart}`}
              aria-expanded={open === "todo"}
              aria-controls={ids.todo}
              onClick={() => toggle("todo")}
            >
              <NotepadIcon />
              <span className={styles.toolLabel}>To-do</span>
              <InkRule className={styles.toolMark} />
              <FocusFrame className={styles.focus} />
            </button>
            <div
              id={ids.todo}
              className={`${styles.panel} ${styles.panelStart} ${styles.todoPanel}`}
              hidden={open !== "todo"}
            >
              <TodoNote nail={false} tilt={0} />
            </div>
          </>
        )}

        {/* The time in chalk, straight on the slate. Idle it is a button:
            tap the clock to set the session (mode, rounds). */}
        {running ? (
          <div data-surface="slate" className={styles.clock}>
            <span className={styles.caption}>{phaseWord}</span>
            <span
              role="timer"
              aria-label={`Time left, ${breakRunning ? "break" : "focus"}${paused ? ", paused" : ""}`}
              className={styles.time}
              data-paused={paused ? "" : undefined}
            >
              <TabularNumber>{formatTime(displaySeconds)}</TabularNumber>
            </span>
          </div>
        ) : (
          <>
            <button
              ref={sessionToggle}
              type="button"
              data-surface="slate"
              className={`${styles.clock} ${styles.clockButton}`}
              aria-label={`Session: ${formatTime(displaySeconds)}, ${mode?.description ?? modeCaption}, ${repetitions} ${repetitions === 1 ? "round" : "rounds"}`}
              aria-expanded={open === "session"}
              aria-controls={ids.session}
              onClick={() => toggle("session")}
            >
              <span className={styles.time}>
                <TabularNumber>{formatTime(displaySeconds)}</TabularNumber>
              </span>
              <span className={styles.caption}>
                {modeCaption}
                {roundsCaption}
                <CrateLidIcon open={open === "session"} />
              </span>
              <FocusFrame className={styles.focus} />
            </button>
            <section
              id={ids.session}
              aria-label="Session"
              className={`${styles.panel} ${styles.panelCenter} ${styles.slatePanel}`}
              hidden={open !== "session"}
            >
              <div data-surface="slate" className={styles.slateFace}>
                <ChoiceGroup
                  legend="Mode"
                  options={MODE_OPTIONS}
                  value={modeId}
                  onChange={(value) => onModeChange(value as PomodoroModeId)}
                  surface="slate"
                />
                {modeId === "flexible" && (
                  <div className={styles.minutes}>
                    <TextInput
                      label="Study"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={customStudyMinutes}
                      onChange={(event) =>
                        onCustomStudyMinutesChange(Number(event.target.value))
                      }
                      aria-label="Study minutes"
                      surface="slate"
                      className={styles.numberField}
                    />
                    <TextInput
                      label="Break"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={customBreakMinutes}
                      onChange={(event) =>
                        onCustomBreakMinutesChange(Number(event.target.value))
                      }
                      aria-label="Break minutes"
                      surface="slate"
                      className={styles.numberField}
                    />
                  </div>
                )}
                <RoundsStepper
                  value={repetitions}
                  onChange={onRepetitionsChange}
                />
              </div>
            </section>
          </>
        )}

        {running ? (
          <div data-surface="slate" className={styles.controls}>
            <Button
              variant="secondary"
              icon={paused ? <PlayIcon /> : <PauseIcon />}
              onClick={onTogglePause}
              loading={focusRunning && pauseToggling}
              disabled={focusRunning && pauseToggling}
            >
              {paused ? "Continue" : "Pause"}
            </Button>
            <Button
              variant="quiet"
              onClick={focusRunning ? onFinish : onEndBreak}
              loading={focusRunning && finishing}
              disabled={focusRunning && finishing}
              aria-label="End session"
            >
              End
            </Button>
          </div>
        ) : (
          <Button
            onClick={onStart}
            loading={loading}
            disabled={loading}
            className={styles.start}
          >
            Start session
          </Button>
        )}

        {!running && (
          <>
            <button
              ref={ambienceToggle}
              type="button"
              data-surface="slate"
              className={`${styles.tool} ${styles.toolEnd}`}
              aria-label={`Ambience: ${sounds}`}
              aria-expanded={open === "ambience"}
              aria-controls={ids.ambience}
              onClick={() => toggle("ambience")}
            >
              <CrateIcon />
              <span className={styles.toolLabel}>Ambience</span>
              <InkRule className={styles.toolMark} />
              <FocusFrame className={styles.focus} />
            </button>
            <section
              id={ids.ambience}
              aria-labelledby={`${ids.ambience}-title`}
              className={`${styles.panel} ${styles.panelEnd} ${styles.cratePanel}`}
              hidden={open !== "ambience"}
            >
              <div data-surface="wood" className={styles.crateInside}>
                <AmbienceMixer
                  worlds={worlds}
                  worldsError={worldsError}
                  level={level}
                  volumes={volumes}
                  onVolumeChange={(id, value) =>
                    setVolumes((v) => ({ ...v, [id]: value }))
                  }
                />
              </div>
              <h2 id={`${ids.ambience}-title`} className={styles.crateFront}>
                Ambience
              </h2>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
