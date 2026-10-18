import type { ButtonHTMLAttributes, ComponentPropsWithoutRef, ReactNode } from "react";
import Link from "next/link";
import styles from "./button.module.css";

/** tonal: soft green action that turns full green on hover/press — for
    repeated in-card actions (e.g. shop "Buy") so the screen's one primary
    CTA stays the only solid green button. locked: inert sand placeholder
    for actions the player can't take yet (pair with disabled). */
type ButtonVariant = "primary" | "secondary" | "tonal" | "locked";
type ButtonSize = "md" | "sm";

type ButtonOwnProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner over the (invisible, still width-holding) label,
      disables the button and sets aria-busy. */
  loading?: boolean;
  className?: string;
  children: ReactNode;
};

/** Renders as a native <button> ... */
type ButtonAsButton = ButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
    href?: undefined;
  };

/** ... or, when `href` is passed, as a Next.js <Link> styled the same way
    (e.g. the home page's "Session starten" CTA, which navigates rather
    than submitting). */
type ButtonAsLink = ButtonOwnProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, "className" | "children"> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

function buttonClassName(
  variant: ButtonVariant,
  size: ButtonSize,
  className: string
) {
  return [
    styles.button,
    styles[variant],
    size === "sm" ? styles.sm : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    loading = false,
    className = "",
    children,
    ...rest
  } = props;
  const classes = buttonClassName(variant, size, className);
  const content = (
    <>
      <span className={styles.label}>{children}</span>
      {loading && <span className={styles.spinner} aria-hidden="true" />}
    </>
  );

  if ("href" in rest && rest.href !== undefined) {
    const linkProps = rest as Omit<ComponentPropsWithoutRef<typeof Link>, "className" | "children">;
    // A link can't be disabled, so while loading it's taken out of the
    // tab order and marked aria-disabled (CSS blocks pointer input).
    const loadingProps = loading
      ? { "aria-busy": true, "aria-disabled": true, tabIndex: -1 }
      : {};
    return (
      <Link {...linkProps} {...loadingProps} className={classes}>
        {content}
      </Link>
    );
  }

  const buttonProps = rest as Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "children"
  >;
  return (
    <button
      type={buttonProps.type ?? "button"}
      className={classes}
      {...buttonProps}
      disabled={buttonProps.disabled || loading}
      aria-busy={loading || undefined}
    >
      {content}
    </button>
  );
}

type IconButtonVariant = "neutral" | "primary";

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  variant?: IconButtonVariant;
  className?: string;
  children: ReactNode;
  /** Required: icon-only buttons have no visible label, so this is the
      only thing a screen reader announces. */
  "aria-label": string;
};

export function IconButton({
  variant = "neutral",
  className = "",
  children,
  ...rest
}: IconButtonProps) {
  const classes = [
    styles.iconButton,
    variant === "primary" ? styles.iconButtonPrimary : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={rest.type ?? "button"} className={classes} {...rest}>
      {children}
    </button>
  );
}
