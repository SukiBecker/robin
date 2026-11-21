import Image from "next/image";
import type { CSSProperties } from "react";
import styles from "./components.module.css";

/* B2: color swatches for the journal-material tokens in app/robin-theme.css.
   Hex values are listed here for display; the swatches themselves paint with
   var(--color-*), so a drift between token and label is visible at a glance. */

const PAPER = "#F7F0E1";
const PAPER_DEEP = "#EEE3CC";

/** WCAG 2 contrast ratio between two opaque hex colors. */
function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return ((hi + 0.05) / (lo + 0.05)).toFixed(2).replace(".", ",");
}

type Swatch = { token: string; value: string; text?: boolean; tape?: boolean };

const GROUPS: { title: string; swatches: Swatch[] }[] = [
  {
    title: "Paper",
    swatches: [
      { token: "--color-paper", value: PAPER },
      { token: "--color-paper-deep", value: PAPER_DEEP },
      { token: "--color-paper-line", value: "#DED0B4" },
    ],
  },
  {
    title: "Ink",
    swatches: [
      { token: "--color-ink", value: "#3B3A36", text: true },
      { token: "--color-ink-muted", value: "#69645A", text: true },
    ],
  },
  {
    title: "Tape",
    swatches: [
      { token: "--color-tape-1", value: "rgba(236, 214, 158, 0.65)", tape: true },
      { token: "--color-tape-2", value: "rgba(184, 204, 176, 0.6)", tape: true },
    ],
  },
  {
    title: "Stamp",
    swatches: [
      { token: "--color-stamp-green", value: "#4A7250", text: true },
      { token: "--color-stamp-rust", value: "#A4503A", text: true },
      { token: "--color-stamp-blue", value: "#3E5A7E", text: true },
    ],
  },
  {
    title: "Existing (unchanged, for comparison)",
    swatches: [
      { token: "--color-canvas", value: "#FBF7EF" },
      { token: "--color-primary", value: "#4CA65A" },
      { token: "--color-ink-soft", value: "#7A756B", text: true },
      { token: "--color-coin", value: "#F2B33D" },
      { token: "--color-xp", value: "#C77B3C" },
      { token: "--color-accent-gold", value: "#C9A227" },
    ],
  },
];

function SwatchCard({ token, value, text, tape }: Swatch) {
  const style = { "--swatch": `var(${token})` } as CSSProperties;
  return (
    <li className={styles.swatch}>
      <span className={tape ? styles.swatchTape : styles.swatchChip} style={style} aria-hidden />
      <span className={styles.swatchName}>{token}</span>
      <span className={styles.swatchValue}>{value}</span>
      {text && (
        <span className={styles.swatchValue}>
          {contrast(value, PAPER)}:1 on paper · {contrast(value, PAPER_DEEP)}:1 on paper-deep
        </span>
      )}
    </li>
  );
}

/** Color check only — not a building block. Rendered in the section's stage. */
export function MaterialSample() {
  return (
    <div className={styles.materialStage}>
      <div className={styles.sheet}>
        <span className={styles.sheetTape} aria-hidden />
        <p className={styles.sheetTitle}>The Garden · est. Sep 2026</p>
        <p className={styles.sheetText}>Roses planted by the fountain. Three sessions this week.</p>
        <p className={styles.sheetMuted}>Second line in ink-muted for the quieter details.</p>
        <span className={styles.stamp} aria-hidden>
          The Garden
          <br />
          Sep 2026
        </span>
      </div>
      {/* B3 test: same content on paper-note.webp (9-slice) + tape-long-1.webp */}
      <div className={styles.sheetAsset}>
        <Image
          src="/ui/tape-long-1.webp"
          alt=""
          width={700}
          height={102}
          sizes="150px"
          className={styles.assetTape}
        />
        <p className={styles.sheetTitle}>The Garden · est. Sep 2026</p>
        <p className={styles.sheetText}>Roses planted by the fountain. Three sessions this week.</p>
        <p className={styles.sheetMuted}>Second line in ink-muted for the quieter details.</p>
        <span className={styles.stamp} aria-hidden>
          The Garden
          <br />
          Sep 2026
        </span>
      </div>
      <div className={`${styles.sheet} ${styles.sheetSmall}`}>
        <span className={`${styles.sheetTape} ${styles.sheetTapeAlt}`} aria-hidden />
        <p className={styles.sheetDate}>14 Nov 2026</p>
        <p className={styles.sheetNote}>Watered the lavender, 45 min.</p>
      </div>
    </div>
  );
}

export function ColorSpecimen() {
  return (
    <div className={styles.colors}>
      {GROUPS.map((g) => (
        <div key={g.title} className={styles.swatchGroup}>
          <h3 className={styles.groupTitle}>{g.title}</h3>
          <ul className={styles.swatchList}>
            {g.swatches.map((s) => (
              <SwatchCard key={s.token} {...s} />
            ))}
          </ul>
        </div>
      ))}
      <div className={styles.swatchGroup}>
        <h3 className={styles.groupTitle}>Shadow</h3>
        <p className={styles.swatchValue}>
          --shadow-paper: 0 1px 1px rgba(92, 64, 32, 0.1), 0 6px 16px -6px rgba(92, 64, 32, 0.28)
        </p>
      </div>
      <h3 className={styles.groupTitle}>
        Sample (color check, not a building block): CSS paper · paper-note.webp + tape-long-1.webp ·
        small CSS note
      </h3>
    </div>
  );
}
