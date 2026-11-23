"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import styles from "./note-dialog.module.css";

type NoteDialogProps = {
  /** id of the visible title inside (aria-labelledby). */
  labelledBy: string;
  /** Called once the dialog has closed (Esc, outside click, close()).
      The caller unmounts it and moves focus back to its opener. */
  onClose: () => void;
  /** The thing shown: a paper note, a wooden panel. A function gets
      close() for its own Close button. */
  children: ReactNode | ((close: () => void) => ReactNode);
  /** Max width on wide screens (default 22rem). */
  width?: string;
  /** Room above the thing for tape or Robin on its edge (default 0). */
  headroom?: string;
  className?: string;
};

/**
 * Shell for a note or panel that opens over a place (Nursery item note,
 * Studyroom ambience panel). Native modal <dialog>, opened on mount with
 * showModal(): focus moves in and stays there, Esc and a click outside
 * close it, the page behind is inert. Desktop: centred; below 600 px a
 * slip from the bottom. Put up with a small wobble / slid in, only
 * without reduced motion.
 */
export function NoteDialog({
  labelledBy,
  onClose,
  children,
  width,
  headroom,
  className = "",
}: NoteDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    // showModal() focuses the first focusable child (Buy), which Safari
    // paints with a focus ring. Park focus on the dialog itself instead;
    // Tab still reaches the buttons, with :focus-visible rings.
    dialog.focus({ preventScroll: true });
  }, []);

  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${className}`}
      aria-labelledby={labelledBy}
      tabIndex={-1}
      onClose={onClose}
      // A click on the dialog box itself (not on the thing) is outside.
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      style={
        {
          ...(width ? { "--dialog-width": width } : null),
          ...(headroom ? { "--dialog-headroom": headroom } : null),
        } as CSSProperties
      }
    >
      <div className={styles.content}>
        {typeof children === "function" ? children(close) : children}
      </div>
    </dialog>
  );
}
