import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import styles from "./label.module.css";

type LabelVariant = "tag" | "inline";

type LabelContent =
  | {
      /** Muted first part, e.g. "Studied today". */
      title?: ReactNode;
      /** The value in full ink, e.g. "1 h 25 m". */
      value: ReactNode;
      children?: never;
    }
  | { children: ReactNode; title?: never; value?: never };

type LabelOwnProps = {
  /** tag = paper label with a double frame (label-frame.webp, 9-slice),
      inline = small text only, no frame. */
  variant?: LabelVariant;
  /** Small rotation in degrees, clamped to ±2. Default: none. */
  tilt?: number;
  as?: "span" | "div";
};

type LabelProps = LabelOwnProps &
  LabelContent &
  Omit<ComponentPropsWithoutRef<"span">, keyof LabelOwnProps | "children" | "title">;

const MAX_TILT = 2;

/** A typewriter label (Courier Prime, normal case, no letter-spacing).
    Replaces uppercase labels and chips. Always as wide as its content:
    it never stretches to fill its parent, also with as="div". */
export function Label({
  variant = "tag",
  tilt = 0,
  as: Tag = "span",
  title,
  value,
  children,
  className = "",
  style,
  ...rest
}: LabelProps) {
  const angle = Math.max(-MAX_TILT, Math.min(MAX_TILT, tilt));
  const tiltStyle = angle ? ({ "--label-tilt": `${angle}deg` } as CSSProperties) : undefined;

  return (
    <Tag
      {...rest}
      className={[styles.label, styles[variant], angle ? styles.tilted : "", className]
        .filter(Boolean)
        .join(" ")}
      style={tiltStyle || style ? { ...tiltStyle, ...style } : undefined}
    >
      {children ?? (
        <>
          {title != null && (
            <>
              <span className={styles.title}>{title}</span>
              <span className={styles.separator} aria-hidden>
                {/* no-break space: a wrap never starts a line with "·" */}
                {" · "}
              </span>
            </>
          )}
          <span className={styles.value}>{value}</span>
        </>
      )}
    </Tag>
  );
}
