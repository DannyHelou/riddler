/** Verifies snake-eyes-boxcars: roll two dice repeatedly; average rolls until both 1-1 and 6-6 have appeared. */
export const expected = 54; // rolls
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  let ones = false;
  let sixes = false;
  for (let n = 1; ; n++) {
    const a = 1 + Math.floor(Math.random() * 6);
    const b = 1 + Math.floor(Math.random() * 6);
    if (a === b && a === 1) ones = true;
    if (a === b && a === 6) sixes = true;
    if (ones && sixes) return n;
  }
}
