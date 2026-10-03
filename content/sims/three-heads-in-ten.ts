/** Verifies three-heads-in-ten: 10 fair flips; chance of a run of at least three heads. */
export const expected = 50.78; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  let run = 0;
  for (let i = 0; i < 10; i++) {
    if (Math.random() < 0.5) {
      if (++run === 3) return 100;
    } else run = 0;
  }
  return 0;
}
