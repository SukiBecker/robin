/** Motion parameters of <PurchaseBurst>. Angles in degrees, 0° = right,
    −90° = straight up; distances in px; times in ms. */
export type BurstTuning = {
  count: number;
  /** Fan centre and half-width: particles spread over centre ± spread. */
  angle: number;
  spread: number;
  /** Peak distance from the origin along each particle's angle. */
  distance: number;
  /** How far below the origin the particles land. */
  fall: number;
  /** Peak rotation; alternates sign per particle (counter-rotating). */
  rotation: number;
  duration: number;
  /** Random start delay per particle, 0…maxDelay. */
  maxDelay: number;
  /** ± random variation, as a fraction of angle step / distance. */
  jitter: number;
};

export const DEFAULT_BURST_TUNING: BurstTuning = {
  count: 8,
  angle: -89,
  spread: 66,
  distance: 98,
  fall: 39,
  rotation: 120,
  duration: 900,
  maxDelay: 70,
  jitter: 0.35,
};
