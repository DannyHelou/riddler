/** Verifies problem-of-points: first to 5 on fair coin flips, stopped at 4-2; Ann's expected share of 100 dollars. */
export const expected = 87.5; // dollars
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  let ann = 4;
  let ben = 2;
  while (ann < 5 && ben < 5) {
    if (Math.random() < 0.5) ann++;
    else ben++;
  }
  return ann === 5 ? 100 : 0;
}
