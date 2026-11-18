import { useId, type ComponentPropsWithoutRef, type ReactNode, type Ref } from "react";
import { FocusFrame, InkRule } from "./ink";
import { surfaceAttr, type Surface } from "./surface";
import styles from "./text-input.module.css";

/** Everything else (value, defaultValue, onChange, type, name,
    autoComplete, placeholder, required, aria-*, data-* …) goes straight
    to the native input. */
type TextInputProps = Omit<ComponentPropsWithoutRef<"input">, "children"> & {
  /** Visible label above the line (Courier, ≥ 13px). Always required —
      a placeholder is never a label. */
  label: ReactNode;
  /** The native input (React 19: ref is a plain prop). */
  ref?: Ref<HTMLInputElement>;
  /** Short help below the line, linked with aria-describedby. */
  hint?: ReactNode;
  /** Error below the line in error-deep (5,37:1 on paper). Sets
      aria-invalid; replaces the hint while shown. */
  error?: ReactNode;
  /** What it stands on: paper (default), slate (a chalk line) or wood
      (a burnt-in line). Errors keep their own pale note on every surface. */
  surface?: Surface;
};

/** No box: a single hand-drawn ink line on the paper, like a writing
    line. Label above in Courier. Focus: the line turns to a firm stroke
    and the shared focus frame is drawn around the line.
    On paper (Settings, Sign-in, To-dos), or on slate / wood at the place
    level (`surface`, e.g. the Studyroom timer board). */
export function TextInput({
  label,
  ref,
  id,
  hint,
  error,
  surface = "paper",
  disabled,
  className = "",
  type = "text",
  "aria-describedby": describedByProp,
  ...rest
}: TextInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const noteId = `${inputId}-note`;
  const note = error ?? hint;
  const describedBy = [describedByProp, note ? noteId : undefined].filter(Boolean).join(" ") || undefined;

  return (
    <div
      className={`${styles.root} ${className}`}
      data-surface={surfaceAttr(surface)}
      data-invalid={error ? true : undefined}
      data-disabled={disabled || undefined}
    >
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <span className={styles.field}>
        <input
          {...rest}
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          aria-invalid={error ? true : rest["aria-invalid"]}
          aria-describedby={describedBy}
          className={styles.input}
        />
        <InkRule className={styles.line} />
        <InkRule className={`${styles.line} ${styles.lineFocus}`} />
        <FocusFrame className={styles.focusFrame} />
      </span>
      {note && (
        <p id={noteId} className={error ? styles.error : styles.hint}>
          {note}
        </p>
      )}
    </div>
  );
}
