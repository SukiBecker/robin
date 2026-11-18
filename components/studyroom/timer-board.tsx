import { Button } from "@/components/journal/button";
import { ChoiceGroup } from "@/components/journal/choice-group";
import { Label } from "@/components/journal/label";
import { RobinNote } from "@/components/journal/robin-note";
import { TabularNumber } from "@/components/journal/tabular-number";
import { TextInput } from "@/components/journal/text-input";
import { formatTime, POMODORO_MODES, type Phase, type PomodoroModeId } from "./session";
import styles from "./studyroom.module.css";

type TimerBoardProps = {
  phase: Phase;
  paused: boolean;
  secondsRemaining: number | null;
  /** Seconds the countdown shows (the selected block length while idle). */
  displaySeconds: number;
  nextUp: string;
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

  loading: boolean;
  pauseToggling: boolean;
  finishing: boolean;
  onStart: () => void;
  onTogglePause: () => void;
  onFinish: () => void;
  onEndBreak: () => void;

  error: string | null;
};

const MODE_OPTIONS = POMODORO_MODES.map((mode) => ({
  value: mode.id,
  label: mode.label,
  srLabel: mode.description,
}));

/** Timer: a small board with a wooden frame on the potting bench, no title
    (the clock says what it is). Idle: countdown, mode, minutes and rounds,
    Start session. Running: only countdown, phase and the two controls — the
    board gets smaller and the garden stays the point. In a break Robin
    leaves one short line. Level, XP and coins are not repeated here: the
    header already shows them. The face is still a light placeholder; it
    becomes slate with chalk in the next step. */
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
  loading,
  pauseToggling,
  finishing,
  onStart,
  onTogglePause,
  onFinish,
  onEndBreak,
  error,
}: TimerBoardProps) {
  const focusRunning = phase === "focus" && sessionId !== null && secondsRemaining !== null;
  const breakRunning = phase === "break" && secondsRemaining !== null;
  const running = focusRunning || breakRunning;

  return (
    <section aria-label="Timer" className={styles.board}>
      <div
        className={`${styles.boardFace} ${styles.timerLayout}`}
        data-state={running ? "running" : "idle"}
        data-phase={running ? phase : undefined}
      >
        {/* The countdown lives on the slip, not on the garden: nothing
            covers the garden but the progress rail. */}
        <p className={styles.clock} data-paused={running && paused ? "" : undefined}>
          <TabularNumber>{formatTime(displaySeconds)}</TabularNumber>
        </p>
        <Label variant="inline" title="Next up" value={nextUp} className={styles.nextUp} />

        {phase === "idle" && (
          <>
            <ChoiceGroup
              legend="Mode"
              options={MODE_OPTIONS}
              value={modeId}
              onChange={(value) => onModeChange(value as PomodoroModeId)}
              className={styles.mode}
            />

            <div className={styles.minutes}>
              {modeId === "flexible" && (
                <>
                  <TextInput
                    label="Study"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={customStudyMinutes}
                    onChange={(event) => onCustomStudyMinutesChange(Number(event.target.value))}
                    aria-label="Study minutes"
                    className={styles.numberField}
                  />
                  <TextInput
                    label="Break"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={customBreakMinutes}
                    onChange={(event) => onCustomBreakMinutesChange(Number(event.target.value))}
                    aria-label="Break minutes"
                    className={styles.numberField}
                  />
                </>
              )}
              <TextInput
                label="Rounds"
                type="number"
                inputMode="numeric"
                min={1}
                value={repetitions}
                onChange={(event) => onRepetitionsChange(Number(event.target.value))}
                className={styles.numberField}
              />
            </div>

            <div className={styles.start}>
              <Button onClick={onStart} loading={loading} disabled={loading}>
                Start session
              </Button>
            </div>
          </>
        )}

        {running && (
          <>
            <Label
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

        {breakRunning && (
          <RobinNote className={styles.breakNote}>{breakQuote}</RobinNote>
        )}

        {phase !== "complete" && error && (
          <p role="alert" className={`${styles.error} ${styles.timerError}`}>
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
