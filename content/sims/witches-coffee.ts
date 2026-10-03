/** Verifies witches-coffee: chance two friends who each stay 30 minutes meet. */
export const expected = 75; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  const a = Math.random() * 60;
  const b = Math.random() * 60;
  return Math.abs(a - b) < 30 ? 100 : 0;
}
