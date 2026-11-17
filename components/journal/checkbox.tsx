import { useId, type ComponentPropsWithoutRef, type ReactNode, type Ref } from "react";
import styles from "./checkbox.module.css";

/** Everything else (checked, defaultChecked, onChange, name, value,
    required, aria-*, data-* …) goes straight to the native input. */
type CheckboxProps = Omit<ComponentPropsWithoutRef<"input">, "type" | "children"> & {
  /** Visible text, also the accessible name. */
  children: ReactNode;
  /** The native input (React 19: ref is a plain prop). */
  ref?: Ref<HTMLInputElement>;
  /** Draw a thin ink line through the text once ticked (to-dos). */
  strike?: boolean;
};

/** A small hand-drawn box in ink on paper. Ticking it draws a handwritten
    tick (~250 ms, no motion with reduced motion). The real input sits on
    top of the box, invisible, so click, Space and the label all work.
    Only on paper (To-dos, Settings, Sign-in). */
export function Checkbox({
  children,
  ref,
  id,
  strike = false,
  className = "",
  disabled,
  ...rest
}: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div
      className={`${styles.root} ${strike ? styles.strike : ""} ${className}`}
      data-disabled={disabled || undefined}
    >
      <span className={styles.control}>
        <input {...rest} ref={ref} id={inputId} type="checkbox" disabled={disabled} className={styles.input} />
        <svg className={styles.mark} viewBox="0 0 24 24" aria-hidden focusable="false">
          {/* box: four slightly wobbly strokes, like a pen */}
          <path
            className={styles.box}
            d="M4.6 4.1C9.2 3.7 14.8 4.4 19.9 3.8C20.3 9.1 19.7 14.9 20.2 20.1C15 20.6 9.1 19.8 3.9 20.3C4.3 15 3.8 9.2 4.6 4.1Z"
          />
          {/* tick: runs out past the top right corner, like handwriting */}
          <path
            className={styles.tick}
            pathLength={1}
            d="M6.8 12.2C8.1 13.6 9.4 15.4 10.4 17.4C12.6 12.4 16.4 7.2 22.6 1.6"
          />
        </svg>
      </span>
      <label htmlFor={inputId} className={styles.text}>
        {children}
      </label>
    </div>
  );
}
