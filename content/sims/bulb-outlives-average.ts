/** Verifies bulb-outlives-average: share of memoryless bulbs (mean life 1,000 h) that outlive 1,000 h. Constant failure chance per minute. */
export const expected = 36.79; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  // Constant hazard: each minute the bulb fails with the same small chance (mean 60,000 minutes).
  // Geometric number of minutes, drawn by inversion (exact for a constant per-minute chance).
  const p = 1 / 60000;
  const minutes = Math.floor(Math.log(1 - Math.random()) / Math.log(1 - p)) + 1;
  return minutes > 60000 ? 100 : 0;
}
