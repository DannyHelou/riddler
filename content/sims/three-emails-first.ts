/** Verifies three-emails-first: first arrival time in a Poisson process on a 60-minute window, given exactly 3 arrivals. */
export const expected = 15; // min
export const kind = 'expectation' as const; // tolerance ±1% relative

function expo(mean: number): number {
  return -mean * Math.log(1 - Math.random());
}

export function simulate(): number | null {
  // Poisson process at 3 per hour via exponential gaps; keep hours with exactly 3 emails.
  const times: number[] = [];
  let t = expo(20);
  while (t < 60) {
    times.push(t);
    if (times.length > 3) return null;
    t += expo(20);
  }
  if (times.length !== 3) return null;
  return times[0];
}
