/** Verifies hit-total-twenty: running total of fair die rolls; chance it ever equals exactly 20. */
export const expected = 28.56; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  let total = 0;
  while (total < 20) total += 1 + Math.floor(Math.random() * 6);
  return total === 20 ? 100 : 0;
}
