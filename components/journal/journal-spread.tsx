import type {
  ComponentPropsWithoutRef,
  CSSProperties,
  ReactNode,
  Ref,
} from "react";
import styles from "./journal-spread.module.css";

type JournalSpreadProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  /** Left page: "this moment" (streak, today/total, calendar). */
  left: ReactNode;
  /** Right page: "the journey" (seed jar, stamps, next stop, weeks). */
  right: ReactNode;
  /** Painted cover (e.g. "/ui/leather-cover.webp") as a 9-slice: its
      rounded corners and board edge are kept, the middle stretches.
      Without it the cover is drawn in CSS (--color-cover + linen weave,
      rounded corners, a darker board edge below). */
  coverImage?: string;
  /** Slice of coverImage in image pixels (corners kept, middle stretched). */
  coverSlice?: number;
  /** Painted page edges (e.g. "/ui/page-edges.webp"): a tall strip of the
      page block seen from the side, outer edge on the LEFT. Stretched to
      the stack's height on both sides (mirrored on the right). Without it
      the edges are fine lines in the paper tones. */
  pageEdgesImage?: string;
  /** false hides the bookmark ribbon. */
  ribbon?: boolean;
  /** Painted ribbon (tall, narrow, tail at the bottom), stretched to the
      ribbon's box. Without it the ribbon is an SVG in --color-ribbon. */
  ribbonImage?: string;
  ref?: Ref<HTMLDivElement>;
};

/** The Journal as an open book (robin-design §3, Journal): a thick cover
    with softly rounded corners all round (the pages sit a little inside
    it), two pages with the fold in the middle once the book is at least
    48rem wide, the page stack as fine lines at the outer edges, and a silk
    ribbon that comes out of the fold at the top and hangs over the bottom
    edge. Narrower: one page, the right page's content follows the left's,
    the ribbon at the right edge. Measured on the book itself (container
    query), not the viewport. Never tilts.
    Pages are cut book paper (paper tone + paper-texture), not the torn
    PaperPanel sheet. Depth at the fold is material: the paper tone gets
    deeper as the pages bend into the binding — no box-shadow.
    Assets plug in via coverImage (leather-cover), pageEdgesImage
    (page-edges) and ribbonImage (ribbon); each falls back to CSS/SVG. */
export function JournalSpread({
  left,
  right,
  coverImage,
  coverSlice = 48,
  pageEdgesImage,
  ribbon = true,
  ribbonImage,
  className = "",
  style,
  ref,
  ...rest
}: JournalSpreadProps) {
  const bookStyle = {
    ...style,
    ...(coverImage && {
      "--cover-image": `url("${coverImage}")`,
      "--cover-slice": coverSlice,
    }),
    ...(pageEdgesImage && { "--page-edges-image": `url("${pageEdgesImage}")` }),
  } as CSSProperties;

  return (
    <div
      {...rest}
      ref={ref}
      className={[
        styles.book,
        coverImage ? styles.paintedCover : "",
        pageEdgesImage ? styles.paintedEdges : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={bookStyle}
    >
      <div className={styles.inner}>
        <div className={styles.pages}>
          <div className={`${styles.page} ${styles.pageLeft}`}>{left}</div>
          <div className={`${styles.page} ${styles.pageRight}`}>{right}</div>
          <span className={styles.fold} aria-hidden="true" />
        </div>
        {ribbon && <Ribbon image={ribbonImage} />}
      </div>
    </div>
  );
}

/** The silk bookmark: a narrow band with a gentle sway, a V-cut tail
    below the book. Decorative only. */
function Ribbon({ image }: { image?: string }) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        aria-hidden="true"
        className={`${styles.ribbon} ${styles.ribbonImage}`}
      />
    );
  }
  return (
    <span className={styles.ribbon} aria-hidden="true">
      <svg
        className={styles.ribbonBand}
        viewBox="0 0 24 100"
        preserveAspectRatio="none"
        focusable="false"
      >
        <path
          d="M5 0C5 26 3.5 46 8 66C12 82 18 88 18 100"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className={styles.ribbonTail} />
    </span>
  );
}
