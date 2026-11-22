import type { ReactNode } from "react";
import { Button } from "@/components/journal/button";
import { ChoiceGroup } from "@/components/journal/choice-group";
import { Label } from "@/components/journal/label";
import { RobinNote } from "@/components/journal/robin-note";
import { TabularNumber } from "@/components/journal/tabular-number";
import { TextInput } from "@/components/journal/text-input";
import { Nail } from "./nail";
import { RoundsStepper } from "./rounds-stepper";
import {
  formatTime,
  POMODORO_MODES,
  type Phase,
  type PomodoroModeId,
} from "./session";
import styles from "./studyroom.module.css";

type TimerBoardProps = {
  phase: Phase;
  paused: boolean;
  secondsRemaining: number | null;
  /** Seconds the countdown shows (the selected block length while idle). */
  displaySeconds: number;
  /** What follows the current phase; null when there is only one round. */
  nextUp: string | null;
  /** Robin's line for the break (the one note of that state). */
  breakQuote: string;
  sessionId: string | null;
  blockIndex: number;
  totalBlocks: number;

  modeId: PomodoroModeId;
  onModeChange: (modeId: PomodoroModeId) => void;
  customStudyMinutes: number;
  onCustomStudyMinutesChange: (minutes: number) => void;
  customBreakMinutes: number;
  onCustomBreakMinutesChange: (minutes: number) => void;
  repetitions: number;
  onRepetitionsChange: (repetitions: number) => void;

  pauseToggling: boolean;
  finishing: boolean;
  onTogglePause: () => void;
  onFinish: () => void;
  onEndBreak: () => void;

  error: string | null;

  /** The run-complete content for the slate (SessionComplete). */
  complete?: ReactNode;
  /** Robin's note at the end of a run (the one note of that state). */
  completeNote: string;
  /** The reward slip after a focus block (RewardSlip), or nothing. */
  reward?: ReactNode;
};

const MODE_OPTIONS = POMODORO_MODES.map((mode) => ({
  value: mode.id,
  label: mode.label,
  srLabel: mode.description,
}));

/** Timer: the slate with its wooden frame on the shed's shelf, no title
    (the clock says what it is). The big time, the mode and rounds (a
    chalk stepper); "Start session" is its own wooden sign next to the
    slate (the page puts it there). From 48rem the time stands left and
    the settings right, so the slate stays low under the window. "Next
    up" only when there is more than one round. Running: only countdown, phase and the two controls — the
    board gets smaller and the garden stays the point. In a break Robin
    leaves one short line, nailed to the frame. At the end of a run the
    slate shows the totals and Robin's note hangs in the same place.
    Level, XP and coins are not repeated here: the header already shows
    them. Wood and slate are CSS placeholders until the assets exist. */
export function TimerBoard({
  phase,
  paused,
  secondsRemaining,
  displaySeconds,
  nextUp,
  breakQuote,
  sessionId,
  blockIndex,
  totalBlocks,
  modeId,
  onModeChange,
  customStudyMinutes,
  onCustomStudyMinutesChange,
  customBreakMinutes,
  onCustomBreakMinutesChange,
  repetitions,
  onRepetitionsChange,
  pauseToggling,
  finishing,
  onTogglePause,
  onFinish,
  onEndBreak,
  error,
  complete,
  completeNote,
  reward,
}: TimerBoardProps) {
  const focusRunning =
    phase === "focus" && sessionId !== null && secondsRemaining !== null;
  const breakRunning = phase === "break" && secondsRemaining !== null;
  const running = focusRunning || breakRunning;
  const isComplete = phase === "complete" && complete !== undefined;

  return (
    <section aria-label="Timer" className={styles.board}>
      <div className={styles.boardFrame}>
        {/* The slate: everything on it is chalk (data-surface). At the
            end of a run it shows the run's totals instead of the timer. */}
        {isComplete ? (
          <div data-surface="slate" className={styles.boardFace}>
            {complete}
          </div>
        ) : (
          <div
            data-surface="slate"
            className={`${styles.boardFace} ${styles.timerLayout}`}
            data-state={running ? "running" : "idle"}
            data-phase={running ? phase : undefined}
          >
            {/* The countdown lives on the slate, not on the garden: nothing
            covers the garden but the progress rail. */}
            <p
              className={styles.clock}
              data-paused={running && paused ? "" : undefined}
            >
              <TabularNumber>{formatTime(displaySeconds)}</TabularNumber>
            </p>
            {nextUp && (
              <Label
                variant="inline"
                title="Next up"
                value={nextUp}
                className={styles.nextUp}
              />
            )}

            {phase === "idle" && (
              <>
                <ChoiceGroup
                  legend="Mode"
                  options={MODE_OPTIONS}
                  value={modeId}
                  onChange={(value) => onModeChange(value as PomodoroModeId)}
                  surface="slate"
                  className={styles.mode}
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

                <div className={styles.start}>
                  <RoundsStepper
                    value={repetitions}
                    onChange={onRepetitionsChange}
                  />
                </div>
              </>
            )}

            {running && (
              <>
                <Label
                  variant="inline"
                  title={focusRunning ? "Focus" : "Break"}
                  value={
                    paused
                      ? "paused"
                      : focusRunning
                        ? `round ${blockIndex} of ${totalBlocks}`
                        : `after round ${blockIndex} of ${totalBlocks}`
                  }
                  className={styles.phase}
                />

                <div className={styles.controls}>
                  <Button
                    variant="secondary"
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
                  >
                    End session
                  </Button>
                </div>
              </>
            )}

            {phase !== "complete" && error && (
              <p
                role="alert"
                className={`${styles.error} ${styles.timerError}`}
              >
                {error}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Robin writes, so his line is on paper, off the slate. Below
          1100px it hangs from the frame; wider, the page nails the same
          note to the wall under the to-do (BoardNote), and this one is
          hidden. */}
      <BoardNote
        phase={phase}
        breakRunning={breakRunning}
        isComplete={isComplete}
        breakQuote={breakQuote}
        completeNote={completeNote}
        className={styles.breakNoteOnBoard}
      />

      {/* The reward slip, nailed onto the slate for a few seconds. */}
      {reward}
    </section>
  );
}

type BoardNoteProps = {
  phase: Phase;
  breakRunning: boolean;
  isComplete: boolean;
  breakQuote: string;
  completeNote: string;
  className?: string;
};

/** Robin's one note of a state, a small slip with a nail: his line for
    the break, or his note at the end of a run. Without his picture —
    Robin himself sits on the window sill (happy at the end). */
export function BoardNote({
  breakRunning,
  isComplete,
  breakQuote,
  completeNote,
  className = "",
}: BoardNoteProps) {
  if (!breakRunning && !isComplete) return null;
  return (
    <div className={`${styles.breakNote} ${className}`}>
      <RobinNote surface="slip" tape={false}>
        {isComplete ? completeNote : breakQuote}
      </RobinNote>
      <Nail className={styles.breakNail} />
    </div>
  );
}
