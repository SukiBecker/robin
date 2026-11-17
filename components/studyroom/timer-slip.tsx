import { Button } from "@/components/button";
import { TabularNumber } from "@/components/journal/tabular-number";
import { SessionStatus } from "./session-status";
import { Slip } from "./slip";
import {
  formatTime,
  POMODORO_MODES,
  type Phase,
  type PomodoroModeId,
  type ProfileSummary,
} from "./session";
import styles from "./studyroom.module.css";

type TimerSlipProps = {
  phase: Phase;
  paused: boolean;
  secondsRemaining: number | null;
  /** Seconds the countdown shows (the selected block length while idle). */
  displaySeconds: number;
  nextUp: string;
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

  profile: ProfileSummary | null;
  level: number | null;
  error: string | null;
};

/** Timer slip: countdown, plus mode choice and start (idle), pause and end (focus / break). */
export function TimerSlip({
  phase,
  paused,
  secondsRemaining,
  displaySeconds,
  nextUp,
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
  profile,
  level,
  error,
}: TimerSlipProps) {
  return (
    <Slip id="timer" title="Timer" tilt={-0.5} className={styles.timerSlip}>
      <div className={styles.timerLayout}>
        {/* The countdown lives on the slip, not on the garden: nothing
            covers the garden but the progress rail. */}
        <div className={styles.timerClock}>
          <p className={styles.timer} data-phase={phase}>
            <TabularNumber>{formatTime(displaySeconds)}</TabularNumber>
          </p>
          <p className={styles.nextUp}>
            <span className={styles.nextUpLabel}>Next up:</span> {nextUp}
          </p>
        </div>

        <div className={styles.timerControls}>
        {phase === "idle" && (
          <>
            <div
              className={styles.modePills}
              role="radiogroup"
              aria-label="Pomodoro mode"
            >
              {POMODORO_MODES.map((mode) => (
                <label
                  key={mode.id}
                  title={mode.description}
                  className={`${styles.modePill} ${
                    modeId === mode.id ? styles.modePillSelected : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="pomodoro-mode"
                    className={styles.srOnlyInput}
                    checked={modeId === mode.id}
                    onChange={() => onModeChange(mode.id)}
                    aria-label={mode.description}
                  />
                  {mode.label}
                </label>
              ))}
            </div>

            {modeId === "flexible" && (
              <div className={styles.fieldRow}>
                <label className={styles.fieldInline}>
                  Study
                  <input
                    type="number"
                    min={1}
                    className={styles.miniInput}
                    value={customStudyMinutes}
                    onChange={(event) =>
                      onCustomStudyMinutesChange(Number(event.target.value))
                    }
                    aria-label="Study minutes"
                  />
                </label>
                <label className={styles.fieldInline}>
                  Break
                  <input
                    type="number"
                    min={1}
                    className={styles.miniInput}
                    value={customBreakMinutes}
                    onChange={(event) =>
                      onCustomBreakMinutesChange(Number(event.target.value))
                    }
                    aria-label="Break minutes"
                  />
                </label>
              </div>
            )}

            <div className={styles.fieldRow}>
              <label className={styles.fieldInline}>
                Repetitions
                <input
                  type="number"
                  min={1}
                  className={styles.miniInput}
                  value={repetitions}
                  onChange={(event) =>
                    onRepetitionsChange(Number(event.target.value))
                  }
                />
              </label>
              <Button size="sm" onClick={onStart} disabled={loading}>
                {loading ? "Starting…" : "Start Session"}
              </Button>
            </div>
          </>
        )}

        {phase === "focus" && sessionId && secondsRemaining !== null && (
          <>
            <div>
              <p className={styles.phaseLabel} data-phase="focus">
                {paused ? "Focus · paused" : "Focus"}
              </p>
              <p className={styles.blockProgress}>
                Block {blockIndex} of {totalBlocks}
              </p>
            </div>

            <div className={styles.controlsRow}>
              <Button
                variant="secondary"
                onClick={onTogglePause}
                disabled={pauseToggling}
              >
                {pauseToggling ? "…" : paused ? "Continue" : "Pause"}
              </Button>
              <button
                type="button"
                className={styles.textButton}
                onClick={onFinish}
                disabled={finishing}
              >
                {finishing ? "Ending…" : "End Session"}
              </button>
            </div>
          </>
        )}

        {phase === "break" && secondsRemaining !== null && (
          <>
            <div>
              <p className={styles.phaseLabel} data-phase="break">
                {paused ? "Break · paused" : "Break"}
              </p>
              <p className={styles.blockProgress}>
                After block {blockIndex} of {totalBlocks}
              </p>
            </div>

            <div className={styles.controlsRow}>
              <Button variant="secondary" onClick={onTogglePause}>
                {paused ? "Continue" : "Pause"}
              </Button>
              <button
                type="button"
                className={styles.textButton}
                onClick={onEndBreak}
              >
                End Session
              </button>
            </div>
          </>
        )}

        {profile && level !== null && (
          <SessionStatus profile={profile} level={level} />
        )}

        {phase !== "complete" && error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        </div>
      </div>
    </Slip>
  );
}
