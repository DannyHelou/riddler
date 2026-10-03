/** Verifies cake-days: 365 people with uniform random birthdays; number of distinct birthday days. */
export const expected = 230.9; // days
export const kind = 'expectation' as const; // tolerance ±1% relative

const stamp = new Int32Array(365);
let trial = 0;

export function simulate(): number | null {
  trial++;
  let days = 0;
  for (let p = 0; p < 365; p++) {
    const d = Math.floor(Math.random() * 365);
    if (stamp[d] !== trial) {
      stamp[d] = trial;
      days++;
    }
  }
  return days;
}
