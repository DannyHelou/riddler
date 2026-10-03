/** Verifies patio-raindrop-edge: average distance from a uniform point in a 10 m square to its nearest edge. */
export const expected = 1.667; // m
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  const x = Math.random() * 10;
  const y = Math.random() * 10;
  return Math.min(x, 10 - x, y, 10 - y);
}
