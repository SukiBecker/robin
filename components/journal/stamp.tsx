import {
  useId,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type Ref,
} from "react";
import styles from "./stamp.module.css";

type StampShape = "round" | "rect" | "double";
type StampColor = "green" | "rust" | "blue";
type StampSize = "sm" | "md" | "lg";
type PlantPrint = "silhouette" | "lines";

/** Everything else (id, data-*, style, event handlers …) goes straight to
    the root element. */
type StampProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  /** Root element (React 19: ref is a plain prop). */
  ref?: Ref<HTMLSpanElement>;
  /** round = postmark: double ring, top/bottom text along the ring.
      rect = rubber stamp with one frame, text line by line.
      double = rubber stamp with a double frame. */
  shape?: StampShape;
  /** Small text along the top of the ring / first line, e.g. "The Garden".
      On the ring at most ~11 characters — longer text: use rect/double. */
  top?: string;
  /** Large middle, e.g. "W46" or "Sep 2026" (Fraunces — big numbers are
      never Courier, robin-design §5). */
  center?: string;
  /** Small text along the bottom of the ring / last line, e.g. "2026".
      On the ring at most ~12 characters. */
  bottom?: string;
  /** Path to an existing plant PNG (final growth stage), e.g.
      "/garden/items/rose-3.png". Printed as a one-colour impression in the
      stamp colour, never as the coloured picture. Without center it fills
      the middle; with center it sits above it. */
  plant?: string;
  /** Name of the plant for screen readers ("Rose"); goes into the
      aria-label. Always set it together with plant. */
  plantName?: string;
  /** lines (default) = luminance threshold: only the darker parts of the
      PNG print, so inner lines (petals, leaves) survive.
      silhouette = the PNG's alpha channel as a solid shape — for pale
      plants (e.g. peony) where "lines" leaves too little ink.
      Long term: own line motifs per plant (with the Herbarium assets). */
  plantPrint?: PlantPrint;
  /** Stamp tokens: --color-stamp-green | -rust | -blue. */
  color?: StampColor;
  /** In em, scales with the surrounding text. Ring and line text never
      drop below 13px (Courier Prime minimum). */
  size?: StampSize;
  /** Degrees, clamped to ±15. Default -6: slightly askew, as pressed by hand. */
  rotate?: number;
  /** "Press" on appear: scale 1.15 → 1, ink fades in, then a short wobble
      (robin-design §8). Only without prefers-reduced-motion. Re-run by
      remounting (change the key). */
  animate?: boolean;
};

const MAX_ROTATE = 15;

/* Shared filters, rendered ONCE by <StampDefs /> in app/layout.tsx. */
const INK_FILTER = "robin-stamp-ink";
const THRESHOLD_FILTER = "robin-stamp-threshold";

/* Ring geometry in a 200 × 200 viewBox. Ring text is 24 units; the round
   stamp is never narrower than 108px (24 × 108/200 ≈ 13px). */
const C = 100;
const R_TOP = 66; // baseline of the top text, glyphs grow outwards
const R_BOTTOM = 82; // baseline of the bottom text, glyphs hang inwards
const RING_FONT = 24;
const COURIER_ADVANCE = 0.6; // monospace: every glyph is 0.6em wide

/* Top: left → right over the top. Bottom: left → right under the bottom
   (counter-clockwise), so both read upright. */
const TOP_ARC = `M ${C - R_TOP} ${C} A ${R_TOP} ${R_TOP} 0 0 1 ${C + R_TOP} ${C}`;
const BOTTOM_ARC = `M ${C - R_BOTTOM} ${C} A ${R_BOTTOM} ${R_BOTTOM} 0 0 0 ${C + R_BOTTOM} ${C}`;

/* Usable arc: ~80% of the half circle (the ends meet the two dots).
   Bottom glyphs hang inwards, so their middle runs at ~R_BOTTOM - 8.
   → top ≈ 11 characters, bottom ≈ 12. */
const RING_ROOM = {
  top: Math.PI * R_TOP * 0.8,
  bottom: Math.PI * (R_BOTTOM - 8) * 0.8,
};

const isDev = process.env.NODE_ENV !== "production";

function warnIfTooLong(where: "top" | "bottom", text: string | undefined) {
  if (!text) return;
  const width = text.length * RING_FONT * COURIER_ADVANCE;
  if (width > RING_ROOM[where]) {
    const max = Math.floor(RING_ROOM[where] / (RING_FONT * COURIER_ADVANCE));
    console.warn(
      `[Stamp] ${where} text "${text}" (${text.length} characters) does not fit on the ring ` +
        `(max. ~${max}); the browser cuts it off. Shorten it or use shape="rect".`
    );
  }
}

/** A printed stamp: postmark (round) or rubber stamp (rect, double),
    in one of the three stamp inks, slightly askew.

    Print look only where it doesn't cost legibility: frame, rings and
    plant are printed at 85% ink with a subtly uneven print (shared SVG
    filter, see StampDefs). The big center keeps the uneven print but at
    full ink; the small text (ring, lines) is plain full ink. So all text
    stays ≥ 4.5:1 on paper. Everything multiplies into the paper below.

    RULE (robin-design §4): A stamp always sits on paper — in a PaperPanel,
    on a label, a seed packet, a journal page — never directly on the
    garden. Ink needs something to be pressed onto.

    Needs <StampDefs /> once on the page (it is in app/layout.tsx).

    Accessibility: role="img" with an aria-label from top, plantName,
    center and bottom; everything inside is aria-hidden. Pass aria-label to
    override. */
export function Stamp({
  shape = "round",
  top,
  center,
  bottom,
  plant,
  plantName,
  plantPrint = "lines",
  color = "green",
  size = "md",
  rotate = -6,
  animate = false,
  className = "",
  style: styleProp,
  ref,
  ...rest
}: StampProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const angle = Math.max(-MAX_ROTATE, Math.min(MAX_ROTATE, rotate));
  const label = [top, plantName, center, bottom].filter(Boolean).join(", ");
  const hasOwnLabel = Boolean(rest["aria-label"] || rest["aria-labelledby"]);

  if (isDev) {
    if (!label && !hasOwnLabel) {
      console.warn(
        "[Stamp] The stamp has no accessible name: give it top, center, bottom, " +
          "plantName or an aria-label."
      );
    } else if (plant && !plantName && !hasOwnLabel) {
      console.warn(
        `[Stamp] plant "${plant}" without plantName — screen readers won't hear it.`
      );
    }
    if (shape === "round") {
      warnIfTooLong("top", top);
      warnIfTooLong("bottom", bottom);
    }
  }

  const style = {
    ...styleProp,
    "--stamp-rotate": `${angle}deg`,
    "--stamp-ink": `url(#${INK_FILTER})`,
    ...(plant ? { "--stamp-plant": `url(${JSON.stringify(plant)})` } : null),
  } as CSSProperties;

  const plantClass = center ? styles.plantSmall : styles.plant;

  /* The middle: plant above a center, plant alone, or center
     alone. Long centers ("Sep 2026") get a smaller size than short ones. */
  const middle = (
    <span className={styles.middle}>
      {plant &&
        (plantPrint === "lines" ? (
          <svg
            viewBox="0 0 100 100"
            className={`${plantClass} ${styles.print}`}
            focusable="false"
          >
            <mask
              id={`${uid}-plant`}
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="100"
              height="100"
            >
              <image
                href={plant}
                x="0"
                y="0"
                width="100"
                height="100"
                preserveAspectRatio="xMidYMid meet"
                filter={`url(#${THRESHOLD_FILTER})`}
              />
            </mask>
            <rect
              width="100"
              height="100"
              fill="currentColor"
              mask={`url(#${uid}-plant)`}
            />
          </svg>
        ) : (
          <span
            className={`${plantClass} ${styles.silhouette} ${styles.print}`}
          />
        ))}
      {center && (
        <span
          className={[
            styles.center,
            center.length > 4 ? styles.long : "",
            styles.printText,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {center}
        </span>
      )}
    </span>
  );

  return (
    <span
      role="img"
      aria-label={label || undefined}
      {...rest}
      ref={ref}
      className={[
        styles.stamp,
        styles[shape === "round" ? "round" : "rect"],
        shape === "double" ? styles.double : "",
        styles[color],
        styles[size],
        animate ? styles.animate : "",
        plant && center ? styles.withPlant : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      <span className={styles.body} aria-hidden>
        {shape === "round" ? (
          <>
            {/* Printed layer: rings and dots. */}
            <svg
              viewBox="0 0 200 200"
              className={`${styles.layer} ${styles.print}`}
              focusable="false"
            >
              <circle cx={C} cy={C} r="95" className={styles.ringOuter} />
              <circle cx={C} cy={C} r="89" className={styles.ringInner} />
              <circle cx={C - 76} cy={C} r="2.6" className={styles.dot} />
              <circle cx={C + 76} cy={C} r="2.6" className={styles.dot} />
            </svg>
            {/* Text layer: full ink, no filter. */}
            <svg
              viewBox="0 0 200 200"
              className={styles.layer}
              focusable="false"
            >
              <defs>
                <path id={`${uid}-top`} d={TOP_ARC} />
                <path id={`${uid}-bottom`} d={BOTTOM_ARC} />
              </defs>
              {top && (
                <text className={styles.ringText}>
                  <textPath
                    href={`#${uid}-top`}
                    startOffset="50%"
                    textAnchor="middle"
                  >
                    {top}
                  </textPath>
                </text>
              )}
              {bottom && (
                <text className={styles.ringText}>
                  <textPath
                    href={`#${uid}-bottom`}
                    startOffset="50%"
                    textAnchor="middle"
                  >
                    {bottom}
                  </textPath>
                </text>
              )}
            </svg>
            {middle}
          </>
        ) : (
          <span className={styles.frame}>
            {/* Printed frame (single or double) behind the lines. */}
            <span className={`${styles.frameInk} ${styles.print}`} />
            {top && <span className={styles.line}>{top}</span>}
            {middle}
            {bottom && <span className={styles.line}>{bottom}</span>}
          </span>
        )}
      </span>
    </span>
  );
}

/** The shared SVG filters for every Stamp. Render exactly once, high up
    (app/layout.tsx). Zero-size and hidden from assistive tech.

    - robin-stamp-ink: edges nudged by about a pixel (coarse noise) and a
      few spots where the ink didn't take (fine grain).
    - robin-stamp-threshold: for plantPrint="lines" — turns the plant PNG
      into a luminance mask that is white only where the picture is dark
      (outlines, shading) and inside its alpha. */
export function StampDefs() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden
      focusable="false"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <filter id={INK_FILTER} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.05"
          numOctaves="2"
          seed="7"
          result="warp"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="warp"
          scale="2.2"
          xChannelSelector="R"
          yChannelSelector="G"
          result="wobbly"
        />
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.85"
          numOctaves="1"
          seed="14"
          result="grain"
        />
        <feColorMatrix
          in="grain"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -5 0 0 0 4.1"
          result="holes"
        />
        <feComposite in="wobbly" in2="holes" operator="in" />
      </filter>
      {/* lum = .2126 R + .7152 G + .0722 B; white where lum < 0.55,
          steep ramp (×9) so it reads as ink or no ink. Alpha stays. */}
      <filter id={THRESHOLD_FILTER} colorInterpolationFilters="sRGB">
        <feColorMatrix
          type="matrix"
          values="-1.913 -6.437 -0.650 0 4.95  -1.913 -6.437 -0.650 0 4.95  -1.913 -6.437 -0.650 0 4.95  0 0 0 1 0"
        />
      </filter>
    </svg>
  );
}
