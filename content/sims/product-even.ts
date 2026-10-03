/** Verifies product-even: the product of three dice is even. */
export const expected = 87.5; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  const roll = () => 1 + Math.floor(Math.random() * 6);
  return (roll() * roll() * roll()) % 2 === 0 ? 100 : 0;
}
