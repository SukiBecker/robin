"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/button";
import styles from "./confirm-dialog.module.css";

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Tints the confirm button as a warning (something gets lost). */
  tone?: "default" | "warning";
  busy?: boolean;
  onConfirm: () => void;
  /** Also called on a backdrop click. Esc is left to the caller, so it
      fits into the caller's own Esc order. */
  onCancel: () => void;
};

/** A small modal asking the player to confirm one action. Focus starts on
    Cancel, so Enter never confirms a lossy action by accident. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "default",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Cancel is the first button.
  useEffect(() => {
    dialogRef.current?.querySelector("button")?.focus({ preventScroll: true });
  }, []);

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className={styles.title}>
          {title}
        </h2>
        <p id="confirm-dialog-message" className={styles.message}>
          {message}
        </p>
        <div className={styles.actions}>
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            size="sm"
            className={tone === "warning" ? styles.warning : undefined}
            onClick={onConfirm}
            loading={busy}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
