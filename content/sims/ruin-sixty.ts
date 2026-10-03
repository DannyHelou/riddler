/**
 * Verifies ruin-sixty: start with 1 dollar, bet 1 dollar at a time with a 60% win chance; chance of ever going broke.
 * Reaching 50 dollars counts as never going broke (ruin from there has chance (2/3)^50, about 2e-9).
 */
export const expected = 66.67; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  let money = 1;
  while (money > 0 && money < 50) money += Math.random() < 0.6 ? 1 : -1;
  return money === 0 ? 100 : 0;
}
