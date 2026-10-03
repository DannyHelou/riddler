/** Verifies two-random-chords-cross: chance two chords between independent uniform points on a circle intersect. */
export const expected = 33.33; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  const a1 = Math.random();
  const a2 = Math.random();
  const b1 = Math.random();
  const b2 = Math.random(); // positions around the circle, as fractions of a turn
  const lo = Math.min(a1, a2);
  const hi = Math.max(a1, a2);
  const in1 = b1 > lo && b1 < hi;
  const in2 = b2 > lo && b2 < hi;
  return in1 !== in2 ? 100 : 0;
}
