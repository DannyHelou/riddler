/** Verifies second-chance: average win with one optional reroll of a die, played optimally. */
export const expected = 4.25; // dollars
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  const roll = () => 1 + Math.floor(Math.random() * 6);
  const first = roll();
  return first >= 4 ? first : roll(); // reroll anything below the 3.5 a reroll is worth
}
