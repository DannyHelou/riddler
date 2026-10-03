/** Verifies median-of-three: chance the median of three uniform numbers on [0, 100] is in [25, 75]. */
export const expected = 68.75; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  const v = [Math.random() * 100, Math.random() * 100, Math.random() * 100].sort((a, b) => a - b);
  return v[1] >= 25 && v[1] <= 75 ? 100 : 0;
}
