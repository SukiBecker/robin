/** "2 seeds · 1 grown"; a bucket at 0 is left out ("3 seeds"). */
export function formatSeedGrown(seed: number, grown: number): string {
  const parts: string[] = [];
  if (seed > 0) parts.push(`${seed} ${seed === 1 ? "seed" : "seeds"}`);
  if (grown > 0) parts.push(`${grown} grown`);
  return parts.join(" · ");
}

/** item_catalog.growth_duration_seconds is study time (the garden grows
    while you learn): "45 min", "2 h", "1 h 30 min". */
export function formatStudyTime(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}
