/** Verifies square-center-vs-edge: chance a uniform point in a square is closer to the center than to the nearest side. */
export const expected = 21.9; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  const x = Math.random() * 2 - 1;
  const y = Math.random() * 2 - 1;
  const toCenter = Math.hypot(x, y);
  const toSide = Math.min(1 - x, 1 + x, 1 - y, 1 + y);
  return toCenter < toSide ? 100 : 0;
}
