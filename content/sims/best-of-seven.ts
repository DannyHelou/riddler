/** Verifies best-of-seven: A wins each game with chance 60%, first to 4 wins; chance A takes the series. */
export const expected = 71.02; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  let a = 0;
  let b = 0;
  while (a < 4 && b < 4) {
    if (Math.random() < 0.6) a++;
    else b++;
  }
  return a === 4 ? 100 : 0;
}
