type LockIconProps = {
  size?: number;
  className?: string;
};

// Illustrated lock asset (hand-designed), same treatment as
// components/coin-icon.tsx and components/xp-icon.tsx. Source: design-src/docs/Schloss.png.
export function LockIcon({ size = 20, className }: LockIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/lock.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: "auto", flexShrink: 0 }}
    />
  );
}
