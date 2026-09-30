/** Verifies coin-two-heads: expected fair-coin flips until two heads in a row. */
export const expected = 6; // flips
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  let flips = 0;
  let streak = 0;
  while (streak < 2) {
    flips++;
    streak = Math.random() < 0.5 ? streak + 1 : 0;
  }
  return flips;
}
