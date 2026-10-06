type CoinIconProps = {
  size?: number;
  className?: string;
};

// Illustrated coin asset (hand-designed, matches the --color-coin /
// --color-coin-deep copper tones in app/bloomly-theme.css) — not an
// inline SVG like the chrome icons in shop/page.tsx, since this one is a
// cropped PNG export. Source: docs/Goldmünze mit funkelndem Stern.png.
export function CoinIcon({ size = 20, className }: CoinIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/coin.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: "auto", flexShrink: 0 }}
    />
  );
}
