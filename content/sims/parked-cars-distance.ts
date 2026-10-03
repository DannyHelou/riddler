/** Verifies parked-cars-distance: average distance between two uniform points on a 1,000 m street. */
export const expected = 333.33; // m
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  return Math.abs(Math.random() * 1000 - Math.random() * 1000);
}
