type XpIconProps = {
  size?: number;
  className?: string;
};

// Illustrated XP asset (hand-designed), same treatment as components/coin-icon.tsx.
// Source: design-src/docs/xp.png.
export function XpIcon({ size = 20, className }: XpIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/xp.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: "auto", flexShrink: 0 }}
    />
  );
}
