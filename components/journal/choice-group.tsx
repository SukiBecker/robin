"use client";

import { useId, type ChangeEvent, type ComponentPropsWithoutRef, type ReactNode, type Ref } from "react";
import styles from "./choice-group.module.css";

export type ChoiceOption = {
  value: string;
  /** Short text in Fraunces, e.g. "25/5". */
  label: ReactNode;
  /** Optional longer name for screen readers, e.g. "25 minutes focus,
      5 minutes break" (the visible label stays short). */
  srLabel?: string;
  disabled?: boolean;
};

/** Everything else (id, aria-*, data-*, style …) goes straight to the
    fieldset. */
type ChoiceGroupProps = Omit<ComponentPropsWithoutRef<"fieldset">, "children" | "onChange" | "defaultValue"> & {
  /** Visible group name (Courier, ≥ 13px), rendered as the legend. */
  legend: ReactNode;
  options: ChoiceOption[];
  /** The fieldset (React 19: ref is a plain prop). */
  ref?: Ref<HTMLFieldSetElement>;
  /** Radio group name for forms; generated if left out. */
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, event: ChangeEvent<HTMLInputElement>) => void;
};

/** One choice out of a few short options (Timer: 25/5 · 50/10 · Flexible).
    Options are plain text in Fraunces side by side; the chosen one is
    circled with a hand-drawn ink ellipse. No pills. Real radio inputs:
    Tab enters the group, arrow keys move the choice. Only on paper. */
export function ChoiceGroup({
  legend,
  options,
  ref,
  name,
  value,
  defaultValue,
  onChange,
  className = "",
  ...rest
}: ChoiceGroupProps) {
  const autoName = useId();
  const groupName = name ?? autoName;
  const controlled = value !== undefined;

  return (
    <fieldset {...rest} ref={ref} className={`${styles.root} ${className}`}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.options}>
        {options.map((o) => (
          <label key={o.value} className={styles.option} data-disabled={o.disabled || undefined}>
            <input
              type="radio"
              name={groupName}
              value={o.value}
              disabled={o.disabled}
              aria-label={o.srLabel}
              {...(controlled
                ? { checked: value === o.value }
                : { defaultChecked: defaultValue === o.value })}
              onChange={(e) => onChange?.(o.value, e)}
              className={styles.input}
            />
            <span className={styles.text}>{o.label}</span>
            {/* drawn once around and a little past the start, like a pen */}
            <svg className={styles.ring} viewBox="0 0 120 48" preserveAspectRatio="none" aria-hidden focusable="false">
              <path
                vectorEffect="non-scaling-stroke"
                d="M96 8.5C80 2.8 34 2.4 14 11.5C-1 18.6 3.8 38 36 43.6C70 49.4 115.5 41.8 116.6 24.4C117.5 11.4 95 4.6 66 5.2"
              />
            </svg>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
