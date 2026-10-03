/** Verifies de-mere-four-dice: chance of at least one six in four rolls of a fair die. */
export const expected = 51.77; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  for (let i = 0; i < 4; i++) if (1 + Math.floor(Math.random() * 6) === 6) return 100;
  return 0;
}
