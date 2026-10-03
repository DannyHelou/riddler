/** Verifies one-and-one: a 60% shooter gets a second free throw only if the first goes in; average points. */
export const expected = 0.96; // points
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  if (Math.random() >= 0.6) return 0;
  return Math.random() < 0.6 ? 2 : 1;
}
