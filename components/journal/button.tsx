import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentPropsWithoutRef, ReactNode } from "react";
import { FocusFrame, InkFrame } from "./ink";
import styles from "./button.module.css";

type ButtonVariant = "primary" | "ink" | "secondary" | "quiet";
type ButtonSize = "md" | "lg";

type ButtonOwnProps = {
  /** primary = the main action at the place level, a wooden sign in the
      material of the place (Garden: button-wood.webp), text burnt in.
      ink = the main action at the Journal level (Sign-up, Settings …):
      the hand-drawn ink frame filled with ink, text in paper. secondary =
      an ink frame without fill, quiet = underlined text only. ink,
      secondary and quiet only on paper, never directly on the garden. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Decorative icon left of the text (own asset icons, no Lucide). */
  icon?: ReactNode;
  /** Shows three ink dots over the invisible label, so the width stays
      the same. Blocks clicks and sets aria-busy. */
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = ButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps> & {
    href?: undefined;
  };

type ButtonAsLink = ButtonOwnProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, keyof ButtonOwnProps | "href"> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

/** A button is an object, not paper: labels are paper, buttons are things
    (robin-design §4). Never a pill, never a label frame. With href it
    renders a link (a), never a button inside a link. The old components/button.tsx stays
    in the app until the switch. */
export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    icon,
    loading = false,
    disabled = false,
    className = "",
    children,
  } = props;

  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    loading ? styles.loading : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const inner = (
    <>
      {variant === "primary" && (
        <>
          {/* the lifted shadow (hover) sits under the sign, faded in by opacity */}
          <span className={`${styles.wood} ${styles.woodLift}`} aria-hidden />
          <span className={styles.wood} aria-hidden />
        </>
      )}
      <span className={styles.content}>
        {icon && (
          <span className={styles.icon} aria-hidden>
            {icon}
          </span>
        )}
        <span>{children}</span>
      </span>
      {(variant === "secondary" || variant === "ink") && <InkFrame className={styles.frame} />}
      <FocusFrame className={styles.focusFrame} />
      {loading && (
        <span className={styles.dots} aria-hidden>
          <span />
          <span />
          <span />
        </span>
      )}
    </>
  );

  if (props.href !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { variant: _v, size: _s, icon: _i, loading: _l, disabled: _d, className: _c, children: _ch, href, ...rest } =
      props;

    // A disabled or loading link is an <a> without href: not focusable,
    // not clickable, announced as disabled.
    if (disabled || loading) {
      return (
        <a
          className={classes}
          aria-disabled="true"
          aria-busy={loading || undefined}
          role="link"
          data-disabled={disabled || undefined}
        >
          {inner}
        </a>
      );
    }

    return (
      <Link {...rest} href={href} className={classes}>
        {inner}
      </Link>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { variant: _v, size: _s, icon: _i, loading: _l, disabled: _d, className: _c, children: _ch, href: _h, type = "button", ...rest } =
    props;

  return (
    <button
      {...rest}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-disabled={disabled || undefined}
    >
      {inner}
    </button>
  );
}
