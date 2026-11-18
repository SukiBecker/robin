"use client";

import {
  useId,
  useState,
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import { FocusFrame, InkRule } from "./ink";
import styles from "./slider.module.css";

type SliderThumb = "ink" | "pebble";

/** Everything else (name, step, onInput, aria-*, data-* …) goes straight
    to the native range input. */
type SliderProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "type" | "children" | "value" | "defaultValue" | "min" | "max"
> & {
  /** Visible label above the track (Courier, ≥ 13px). */
  label: ReactNode;
  /** The native input (React 19: ref is a plain prop). */
  ref?: Ref<HTMLInputElement>;
  /** pebble (default) = a smooth river pebble, ink = a small ink blot. */
  thumb?: SliderThumb;
  /** A 28px row instead of the 44px touch row, for dense layouts (Studyroom
      Ambience). Touch screens (pointer: coarse) still get 44px. */
  compact?: boolean;
  min?: number;
  max?: number;
  value?: number;
  defaultValue?: number;
  /** Text for the value next to the label and for aria-valuetext,
      e.g. (v) => `${v} %`. Without it, no value is shown. */
  formatValue?: (value: number) => string;
  /** Simple alternative to formatValue that also works from a Server
      Component: shows the value with this suffix, e.g. " %" → "60 %". */
  unit?: string;
};

const toNumber = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** A range slider in the journal material (Sounds): the track is a thin
    hand-drawn ink line, the filled part the same line as a firm stroke,
    the handle a small object (pebble or ink blot). The real input range lies on top,
    invisible, so mouse, touch and arrow keys all work natively.
    Only on paper. */
export function Slider({
  label,
  ref,
  id,
  thumb = "pebble",
  compact = false,
  min: minProp = 0,
  max: maxProp = 100,
  value,
  defaultValue,
  formatValue,
  unit,
  onChange,
  disabled,
  className = "",
  style,
  ...rest
}: SliderProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const min = toNumber(minProp, 0);
  const max = Math.max(min, toNumber(maxProp, 100));

  const [inner, setInner] = useState(() => toNumber(defaultValue, (min + max) / 2));
  const controlled = value !== undefined;
  const current = Math.min(max, Math.max(min, controlled ? toNumber(value, min) : inner));
  const ratio = max === min ? 0 : (current - min) / (max - min);
  const shown = formatValue ? formatValue(current) : unit !== undefined ? `${current}${unit}` : undefined;

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (!controlled) setInner(Number(e.target.value));
    onChange?.(e);
  }

  return (
    <div
      className={`${styles.root} ${styles[thumb]} ${compact ? styles.compact : ""} ${className}`}
      style={{ ...style, "--p": ratio } as CSSProperties}
      data-disabled={disabled || undefined}
    >
      <div className={styles.head}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
        {shown !== undefined && (
          <span className={styles.value} aria-hidden>
            {shown}
          </span>
        )}
      </div>
      <div className={styles.field}>
        <InkRule className={styles.track} />
        {/* the same line again, firmer, clipped at the handle */}
        <InkRule className={styles.fill} />
        <span className={styles.thumb} aria-hidden />
        <FocusFrame className={styles.focusFrame} />
        <input
          {...rest}
          ref={ref}
          id={inputId}
          type="range"
          min={min}
          max={max}
          disabled={disabled}
          aria-valuetext={shown ?? rest["aria-valuetext"]}
          {...(controlled ? { value: current } : { defaultValue: inner })}
          onChange={handleChange}
          className={styles.input}
        />
      </div>
    </div>
  );
}
