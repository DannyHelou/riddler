/** Verifies two-glasses-sum: chance two uniform fill levels add to more than 1.5. */
export const expected = 12.5; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  return Math.random() + Math.random() > 1.5 ? 100 : 0;
}
