import type { CSSProperties } from "react";
import styles from "./seed-packet-image.module.css";

/*
 * ---- Fine-tuning ----
 * All values are % of public/garden/seedbag.png (1254×1254), measured on
 * the PNG itself, so they stay valid at any rendered size.
 */

/** Visible outline of the bag inside the PNG (it has wide transparent
    margins). The component crops to this box so the bag fills the slot. */
const BAG_BOX = { left: 16.4, top: 15.0, width: 67.4, height: 72.3 };

/** Center of the cream label. Not the PNG's center — the label sits a
    little right of and below it. */
const LABEL_CENTER_X = 50.5;
const LABEL_CENTER_Y = 55.0;
/** Box the item image is fitted into (object-fit: contain). The cream
    area itself is ~47% × 32%; these leave some paper around the print. */
const LABEL_WIDTH = 40;
const LABEL_HEIGHT = 27;

/** Tint the bag by category (flower vs. plant). Off by default. */
const TINT_ENABLED = false;
/** Theme tokens multiplied over the bag; categories missing here stay plain. */
const TINT_BY_CATEGORY: Record<string, string> = {
  flower: "var(--color-world-accent)",
  plant: "var(--color-fern)",
};
/** 0–1: how strongly the tint shows through. */
const TINT_STRENGTH = 0.3;

const SEEDBAG_SRC = "/garden/seedbag.png";

/** A PNG-percentage x/y/size → percentage of the cropped bag box. */
const toBoxX = (value: number) =>
  ((value - BAG_BOX.left) / BAG_BOX.width) * 100;
const toBoxY = (value: number) =>
  ((value - BAG_BOX.top) / BAG_BOX.height) * 100;
const toBoxW = (value: number) => (value / BAG_BOX.width) * 100;
const toBoxH = (value: number) => (value / BAG_BOX.height) * 100;

const PACKET_VARS = {
  "--bag-aspect": `${BAG_BOX.width} / ${BAG_BOX.height}`,
  "--bag-left": `${-toBoxW(BAG_BOX.left)}%`,
  "--bag-top": `${-toBoxH(BAG_BOX.top)}%`,
  "--bag-width": `${toBoxW(100)}%`,
  "--bag-height": `${toBoxH(100)}%`,
  "--label-x": `${toBoxX(LABEL_CENTER_X)}%`,
  "--label-y": `${toBoxY(LABEL_CENTER_Y)}%`,
  "--label-width": `${toBoxW(LABEL_WIDTH)}%`,
  "--label-height": `${toBoxH(LABEL_HEIGHT)}%`,
  "--tint-strength": TINT_STRENGTH,
  "--seedbag-url": `url(${SEEDBAG_SRC})`,
} as CSSProperties;

type SeedPacketImageProps = {
  /** The item's normal (fully grown) illustration, printed on the label. */
  src: string | null;
  category: string | null;
  /** E.g. "Seed: Hedge". */
  alt: string;
  className?: string;
};

/**
 * A seed packet with the item's own illustration "printed" on its label —
 * composited in CSS, so no per-item seed art is needed.
 */
export function SeedPacketImage({
  src,
  category,
  alt,
  className,
}: SeedPacketImageProps) {
  const tint =
    TINT_ENABLED && category ? TINT_BY_CATEGORY[category] : undefined;
  return (
    <span
      className={`${styles.packet} ${className ?? ""}`}
      style={
        tint
          ? ({ ...PACKET_VARS, "--tint": tint } as CSSProperties)
          : PACKET_VARS
      }
      role="img"
      aria-label={alt}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.bag} src={SEEDBAG_SRC} alt="" />
      {tint && <span className={styles.tint} aria-hidden="true" />}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.print} src={src} alt="" />
      )}
    </span>
  );
}
