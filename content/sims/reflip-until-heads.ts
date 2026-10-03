/** Verifies reflip-until-heads: 10 coins; each round the tails are reflipped; average rounds until all show heads. */
export const expected = 4.726; // rounds
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  let left = 10;
  let rounds = 0;
  while (left > 0) {
    rounds++;
    let tails = 0;
    for (let i = 0; i < left; i++) if (Math.random() < 0.5) tails++;
    left = tails;
  }
  return rounds;
}
