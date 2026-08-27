import styles from "./robin-mascot.module.css";

type RobinMascotProps = {
  size?: number;
  className?: string;
};

/**
 * Robin (Rotkehlchen), Bloomly's mascot — a simple flat-vector stand-in
 * until real illustration assets exist (see docs/BLOOMLY.md §12, §14:
 * illustration production is deferred until the core session loop is
 * verified end-to-end). Built from the same palette as the rest of the
 * app rather than arbitrary colors, so it reads as native to the system.
 */
export function RobinMascot({ size = 160, className }: RobinMascotProps) {
  return (
    <span className={`${styles.wrap} ${className ?? ""}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 160 165" width={size} height={size} role="img" aria-label="Robin, the Bloomly mascot">
        {/* legs */}
        <rect x="68" y="130" width="5" height="16" rx="2.5" fill="#362b1f" />
        <rect x="87" y="130" width="5" height="16" rx="2.5" fill="#362b1f" />
        <ellipse cx="70.5" cy="150" rx="8" ry="3.4" fill="#e8b563" />
        <ellipse cx="89.5" cy="150" rx="8" ry="3.4" fill="#e8b563" />

        {/* body */}
        <ellipse cx="80" cy="100" rx="42" ry="39" fill="#8a6a4d" />
        {/* wing */}
        <ellipse
          cx="113"
          cy="102"
          rx="15"
          ry="26"
          fill="#6e5339"
          transform="rotate(18 113 102)"
        />
        {/* belly */}
        <ellipse cx="80" cy="124" rx="27" ry="19" fill="#c9a97e" />
        {/* breast */}
        <ellipse cx="80" cy="99" rx="24" ry="27" fill="#db7d48" />

        {/* head */}
        <circle cx="80" cy="58" r="28" fill="#8a6a4d" />
        {/* cheek blush */}
        <ellipse cx="76" cy="67" rx="6" ry="4" fill="#f2c6d1" opacity="0.55" />

        {/* knit hat */}
        <ellipse cx="80" cy="34" rx="30" ry="20" fill="#5f945b" />
        <rect x="50" y="44" width="60" height="13" rx="6.5" fill="#3f6a3c" />
        <circle cx="80" cy="13" r="7" fill="#f2c6d1" />

        {/* face */}
        <circle cx="92" cy="58" r="4.2" fill="#362b1f" />
        <circle cx="93.4" cy="56.4" r="1.3" fill="#fffbf4" />
        <path d="M100,61 L113,65.5 L100,70 Z" fill="#e8b563" />
      </svg>
    </span>
  );
}
