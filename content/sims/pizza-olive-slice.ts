/** Verifies pizza-olive-slice: average share of a pizza (two random cuts through the center) taken by the slice holding a fixed off-center olive. */
export const expected = 33.33; // %
export const kind = 'expectation' as const; // tolerance ±1% relative

const TAU = 2 * Math.PI;

export function simulate(): number | null {
  const a = Math.random() * Math.PI; // direction of cut 1 (a line through the center)
  const b = Math.random() * Math.PI; // direction of cut 2
  const rays = [a, a + Math.PI, b, b + Math.PI].sort((p, q) => p - q);
  const olive = 1; // fixed angular position of the olive
  // Find the two consecutive rays around the olive.
  let slice = 0;
  for (let i = 0; i < 4; i++) {
    const lo = rays[i];
    const hi = i < 3 ? rays[i + 1] : rays[0] + TAU;
    const o = olive < lo ? olive + TAU : olive;
    if (o >= lo && o < hi) slice = hi - lo;
  }
  return (slice / TAU) * 100;
}
