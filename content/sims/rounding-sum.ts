/** Verifies rounding-sum: chance round(x) + round(y) = round(x + y) for x, y uniform on [0, 10]. */
export const expected = 75; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  const x = Math.random() * 10;
  const y = Math.random() * 10;
  return Math.round(x) + Math.round(y) === Math.round(x + y) ? 100 : 0;
}
