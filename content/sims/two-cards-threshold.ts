/** Verifies two-cards-threshold: chance of ending with the larger of two uniforms, keeping the first if it is above 1/2. */
export const expected = 75; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  const x = Math.random();
  const y = Math.random();
  const mine = x > 0.5 ? x : y;
  return mine === Math.max(x, y) ? 100 : 0;
}
