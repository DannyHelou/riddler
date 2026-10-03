/** Verifies carnival-coin-grid: chance a 2 cm coin dropped on a 5 cm grid touches no line. */
export const expected = 36; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  // Coin center lands uniformly on a large board; reduce to its position within its square.
  const x = (Math.random() * 500) % 5;
  const y = (Math.random() * 500) % 5;
  const r = 1;
  const clear = x > r && x < 5 - r && y > r && y < 5 - r;
  return clear ? 100 : 0;
}
