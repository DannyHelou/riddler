/** Verifies random-square-area: average area of a square with uniform random side on [0, 10] cm. */
export const expected = 33.33; // cm²
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  const s = Math.random() * 10;
  return s * s;
}
