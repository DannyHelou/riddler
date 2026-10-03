/** Verifies pentagon-cover: random walk on a 5-cycle; average steps until all 5 corners are visited. */
export const expected = 10; // minutes
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  const seen = [true, false, false, false, false];
  let count = 1;
  let pos = 0;
  let steps = 0;
  while (count < 5) {
    pos = (pos + (Math.random() < 0.5 ? 1 : 4)) % 5;
    steps++;
    if (!seen[pos]) {
      seen[pos] = true;
      count++;
    }
  }
  return steps;
}
