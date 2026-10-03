/** Verifies tie-flips: two people flip a fair coin 10 times each; chance of equal head counts. */
export const expected = 17.62; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  let ann = 0;
  let ben = 0;
  for (let i = 0; i < 10; i++) {
    if (Math.random() < 0.5) ann++;
    if (Math.random() < 0.5) ben++;
  }
  return ann === ben ? 100 : 0;
}
