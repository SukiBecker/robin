"use client";

import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type Ref,
} from "react";
import { authCopy } from "@/lib/copy/auth";
import styles from "./text-field.module.css";

type TextFieldProps = Omit<ComponentPropsWithRef<"input">, "children"> & {
  label: string;
  helpText?: string;
  /** Replaces helpText while set; marks the input aria-invalid. */
  error?: string;
  /** Password fields only. The toggle keeps this label in both states and
      reports its state via aria-pressed, so screen readers don't hear
      "Hide password, pressed". */
  showPasswordLabel?: string;
  /** Password fields only: tooltip while the password is visible. */
  hidePasswordLabel?: string;
};

/** Label + input + help/error text, with a show/hide toggle for passwords. */
export function TextField({
  label,
  helpText,
  error,
  showPasswordLabel = authCopy.common.showPassword,
  hidePasswordLabel = authCopy.common.hidePassword,
  id,
  type = "text",
  className = "",
  disabled,
  ref,
  "aria-describedby": ariaDescribedBy,
  ...rest
}: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? `${autoId}-input`;
  const descriptionId = `${autoId}-description`;
  const description = error ?? helpText;

  const isPassword = type === "password";
  const [revealed, setRevealed] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const setRefs = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      assignRef(ref, node);
    },
    [ref]
  );

  // Swapping the input type resets the caret to 0 — in Chrome a frame
  // after the commit, after a real pointer click — so the selection is
  // saved on toggle and restored both right after the re-render and once
  // more on the next frame.
  const pendingSelection = useRef<[number | null, number | null] | null>(null);
  useLayoutEffect(() => {
    const input = inputRef.current;
    const selection = pendingSelection.current;
    if (!input || !selection) return;
    pendingSelection.current = null;
    const restore = () => {
      if (document.activeElement === input) {
        input.setSelectionRange(selection[0], selection[1]);
      }
    };
    restore();
    const frame = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(frame);
  }, [revealed]);

  function toggleRevealed() {
    const input = inputRef.current;
    if (input) pendingSelection.current = [input.selectionStart, input.selectionEnd];
    setRevealed((value) => !value);
  }

  const describedBy = [ariaDescribedBy, description ? descriptionId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>

      <div className={styles.control}>
        <input
          {...rest}
          ref={setRefs}
          id={inputId}
          type={isPassword && revealed ? "text" : type}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={[
            styles.input,
            isPassword ? styles.withToggle : "",
            error ? styles.invalid : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
        />

        {isPassword && (
          <button
            type="button"
            className={styles.toggle}
            aria-label={showPasswordLabel}
            aria-pressed={revealed}
            aria-controls={inputId}
            title={revealed ? hidePasswordLabel : showPasswordLabel}
            disabled={disabled}
            // Keep focus (and the caret) in the input on mouse/touch clicks.
            onMouseDown={(event) => event.preventDefault()}
            onClick={toggleRevealed}
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>

      {description && (
        <p id={descriptionId} className={error ? styles.error : styles.help}>
          {description}
        </p>
      )}
    </div>
  );
}

function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M1.75 10S4.75 4.25 10 4.25 18.25 10 18.25 10 15.25 15.75 10 15.75 1.75 10 1.75 10Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.75" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M8.1 4.45A8 8 0 0 1 10 4.25c5.25 0 8.25 5.75 8.25 5.75a14.6 14.6 0 0 1-2.2 2.9M5.3 5.8C3 7.3 1.75 10 1.75 10S4.75 15.75 10 15.75a8 8 0 0 0 4.2-1.15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.05 8.05a2.75 2.75 0 0 0 3.9 3.9M2.75 2.75l14.5 14.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
