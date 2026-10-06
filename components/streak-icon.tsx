type StreakIconProps = {
  size?: number;
  className?: string;
};

// Illustrated streak asset (hand-designed), same treatment as
// components/coin-icon.tsx, xp-icon.tsx and lock-icon.tsx. Deliberately
// pine-green (--color-streak in app/bloomly-theme.css), not the primary
// CTA green or the coin/gold accent — see that file's comment for why.
// Source: docs/streak_flame.png.
export function StreakIcon({ size = 20, className }: StreakIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/streak.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: "auto", flexShrink: 0 }}
    />
  );
}
