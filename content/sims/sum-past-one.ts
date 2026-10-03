/** Verifies sum-past-one: average number of uniform draws until the total exceeds 1. */
export const expected = 2.718; // presses
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  let total = 0;
  let presses = 0;
  while (total <= 1) {
    total += Math.random();
    presses++;
  }
  return presses;
}
