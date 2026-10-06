import type { ButtonHTMLAttributes, ComponentPropsWithoutRef, ReactNode } from "react";
import Link from "next/link";
import styles from "./button.module.css";

type ButtonVariant = "primary" | "secondary";
type ButtonSize = "md" | "sm";

type ButtonOwnProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
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
    variant === "secondary" ? styles.secondary : styles.primary,
    size === "sm" ? styles.sm : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", className = "", children, ...rest } =
    props;
  const classes = buttonClassName(variant, size, className);

  if ("href" in rest && rest.href !== undefined) {
    const linkProps = rest as Omit<ComponentPropsWithoutRef<typeof Link>, "className" | "children">;
    return (
      <Link {...linkProps} className={classes}>
        {children}
      </Link>
    );
  }

  const buttonProps = rest as Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "children"
  >;
  return (
    <button type={buttonProps.type ?? "button"} className={classes} {...buttonProps}>
      {children}
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
