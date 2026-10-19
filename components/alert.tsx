"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./alert.module.css";

type AlertVariant = "error" | "success" | "info";

type AlertProps = {
  variant: AlertVariant;
  /** Empty for success/info still renders the (box-less) live region, so
      keep the Alert mounted and swap its text — a status region that
      appears together with its message often isn't announced. */
  children?: ReactNode;
  /** Shown to the right of the message, e.g. <Button size="sm">. Box only, ignored with compact. */
  action?: ReactNode;
  /** Inline text without a box, for short confirmations like "Saved." */
  compact?: boolean;
  /** Fades the message out after this long (instantly with reduced motion). */
  autoHideMs?: number;
  /** Called once the message has been hidden, so the page can reset its state. */
  onHide?: () => void;
  className?: string;
};

/** Matches the opacity transition in alert.module.css. */
const FADE_MS = 200;

type Phase = "shown" | "hiding" | "hidden";

export function Alert({
  variant,
  children,
  action,
  compact = false,
  autoHideMs,
  onHide,
  className = "",
}: AlertProps) {
  const hasContent =
    children !== null && children !== undefined && children !== false && children !== "";
  // Restart the timer when the text changes; JSX children only count as
  // "changed" when they appear or disappear (their identity changes on
  // every render) — pass a new `key` to restart for those.
  const contentKey =
    typeof children === "string" || typeof children === "number" ? String(children) : hasContent;

  const [phase, setPhase] = useState<Phase>("shown");

  const onHideRef = useRef(onHide);
  useEffect(() => {
    onHideRef.current = onHide;
  });

  const finish = useCallback(() => {
    setPhase("hidden");
    onHideRef.current?.();
  }, []);

  useEffect(() => {
    setPhase("shown");
    if (!contentKey || !autoHideMs) return;

    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    const hideTimer = setTimeout(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        finish();
        return;
      }
      setPhase("hiding");
      fadeTimer = setTimeout(finish, FADE_MS);
    }, autoHideMs);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(fadeTimer);
    };
  }, [contentKey, autoHideMs, finish]);

  const visible = hasContent && phase !== "hidden";
  const role = variant === "error" ? "alert" : "status";

  // Errors use role="alert", which is announced on insertion, so there's
  // no need to keep an empty region around.
  if (!visible && variant === "error") return null;

  const classes = visible
    ? [
        compact ? styles.compact : styles.box,
        styles[variant],
        action && !compact ? styles.withAction : "",
        phase === "hiding" ? styles.hiding : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")
    : className || undefined;

  return (
    <div role={role} className={classes}>
      {visible &&
        (action && !compact ? (
          <>
            <div className={styles.message}>{children}</div>
            <div className={styles.action}>{action}</div>
          </>
        ) : (
          children
        ))}
    </div>
  );
}
