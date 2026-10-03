/** Verifies regression-retake: expected retake score given a first score of 20, with score = talent + luck, both N(0, 10^2). */
export const expected = 10; // points
export const kind = 'expectation' as const; // tolerance ±1% relative

function normal(): number {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function simulate(): number | null {
  const talent = 10 * normal();
  const luck = 10 * normal();
  const first = talent + luck;
  if (Math.abs(first - 20) > 0.5) return null; // condition on a first score of about 20
  return talent + 10 * normal();
}
