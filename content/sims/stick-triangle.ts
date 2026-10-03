/** Verifies stick-triangle: chance a stick broken at two random points forms a triangle. */
export const expected = 25; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  const x = Math.random();
  const y = Math.random();
  const lo = Math.min(x, y);
  const hi = Math.max(x, y);
  const pieces = [lo, hi - lo, 1 - hi];
  return pieces.every((p) => p < 0.5) ? 100 : 0;
}
