import Link from "next/link";
import type { ComponentPropsWithoutRef, Ref } from "react";
import { GameIcon, type GameIconName } from "./game-icon";
import { FocusFrame } from "./ink";
import styles from "./bookmark.module.css";

type BookmarkProps = Omit<ComponentPropsWithoutRef<typeof Link>, "children"> & {
  /** Navigation icon (used at 24 px, the minimum for navigation icons).
      Missing icons show the GameIcon placeholder. */
  icon: GameIconName;
  /** Screen name, exactly as in robin-design §10 (Studyroom, Garden …). */
  label: string;
  /** The current screen: longer ribbon in stamp-green, aria-current="page". */
  active?: boolean;
  /** Below 55rem: icon only (≥ 44 px), the label stays for screen readers;
      the active ribbon keeps its label next to the icon. */
  iconOnNarrow?: boolean;
  ref?: Ref<HTMLAnchorElement>;
};

/**
 * One bookmark ribbon of the journal frame (robin-design §3, variant A):
 * a fabric ribbon that hangs from the top edge of the header and out
 * below it. The link itself — the click area — is exactly the height of
 * its row (give the row `align-items: stretch`), so the header's measured
 * height never includes the ribbon. The end that hangs below is
 * decoration only (pointer-events: none) and may lie over the garden.
 *
 * Active: the ribbon hangs further, painted green, text in paper (≥ 4.8:1).
 * The others hang short in linen, text in ink. Painted assets
 * (public/ui/nav-band-*): the swallowtail end keeps its aspect ratio, the
 * body above it stretches to any length.
 */
export function Bookmark({
  icon,
  label,
  active = false,
  iconOnNarrow = false,
  className = "",
  ref,
  ...rest
}: BookmarkProps) {
  return (
    <Link
      {...rest}
      ref={ref}
      className={[styles.bookmark, iconOnNarrow ? styles.iconOnNarrow : "", className].filter(Boolean).join(" ")}
      aria-current={active ? "page" : undefined}
    >
      <span className={styles.hang} aria-hidden>
        <span className={styles.shade}>
          <span className={styles.ribbon}>
            <span className={styles.body} />
            <span className={styles.end} />
          </span>
        </span>
      </span>
      <GameIcon name={icon} size={24} />
      <span className={styles.label}>{label}</span>
      <FocusFrame className={styles.focusFrame} />
    </Link>
  );
}
