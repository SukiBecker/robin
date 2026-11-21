import styles from "./studyroom.module.css";

/** A small terracotta pot with a seedling in a corner of the potting
    bench — decoration only (aria-hidden). Terracotta is the garden
    world's material for pots (robin-design §4). SVG placeholder until a
    painted sprite exists; the leaves are drawn, not photographic. */
export function SeedlingPot({ className = "" }: { className?: string }) {
  return (
    <span className={`${styles.pot} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 48 60" width="48" height="60" focusable="false">
        {/* seedling: a slightly bent stem, two leaves */}
        <path
          d="M24.5 31 C24 25 25.2 20.5 24.2 15.5"
          fill="none"
          stroke="#5f7f43"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M24.3 17.5 C19.5 18.4 15.4 15.6 14.2 11.2 C19.2 10.6 23.2 13 24.3 17.5 Z"
          fill="#7da35c"
        />
        <path
          d="M24.4 16.2 C26.6 11.6 31 9.8 35.4 10.8 C33.9 15 29.4 17.2 24.4 16.2 Z"
          fill="#6c9450"
        />
        <path
          d="M24.2 17.3 C20.5 15.6 17.6 13.6 15.4 11.8"
          fill="none"
          stroke="#5f7f43"
          strokeWidth="0.6"
          opacity="0.6"
        />
        {/* pot: body, darker shade on the right, rim, soil */}
        <path
          d="M11.5 35 L36.5 35 L33.4 57.2 Q33.2 58.6 31.8 58.6 L16.2 58.6 Q14.8 58.6 14.6 57.2 Z"
          fill="#b5653f"
        />
        <path
          d="M29 35 L36.5 35 L33.4 57.2 Q33.2 58.6 31.8 58.6 L28.6 58.6 Z"
          fill="#9b5434"
          opacity="0.7"
        />
        <rect
          x="9.2"
          y="29.6"
          width="29.6"
          height="6.4"
          rx="1.4"
          fill="#c4744c"
        />
        <rect
          x="9.2"
          y="34.4"
          width="29.6"
          height="1.6"
          fill="#9b5434"
          opacity="0.55"
        />
        <ellipse cx="24" cy="30.3" rx="13.2" ry="1.7" fill="#5a4030" />
      </svg>
    </span>
  );
}
