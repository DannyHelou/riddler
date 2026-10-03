/** Verifies drunk-ant: average edges a random-walking ant takes to reach the opposite corner of a cube. */
export const expected = 10; // edges
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  // Corners are 3-bit numbers; an edge flips one bit. Start at 000, target 111.
  let at = 0;
  let edges = 0;
  while (at !== 7) {
    at ^= 1 << Math.floor(Math.random() * 3);
    edges++;
  }
  return edges;
}
