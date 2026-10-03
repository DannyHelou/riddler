/** Verifies three-flats: 3 flats in random order; pass on the first, take the first later one better than all before. Chance of the best. */
export const expected = 50; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  const q = [Math.random(), Math.random(), Math.random()]; // quality, higher is better
  const best = Math.max(q[0], q[1], q[2]);
  let seen = q[0];
  for (let i = 1; i < 3; i++) {
    if (q[i] > seen) return q[i] === best ? 100 : 0;
    seen = Math.max(seen, q[i]);
  }
  return 0; // never took one, so did not get the best
}
