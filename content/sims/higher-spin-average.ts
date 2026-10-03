/** Verifies higher-spin-average: average of the larger of two uniform numbers on [0, 100]. */
export const expected = 66.67; // points
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  return Math.max(Math.random() * 100, Math.random() * 100);
}
