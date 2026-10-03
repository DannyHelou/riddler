/** Verifies newton-pepys: roll 12 fair dice; chance of at least two sixes. */
export const expected = 61.87; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  let sixes = 0;
  for (let i = 0; i < 12; i++) if (1 + Math.floor(Math.random() * 6) === 6) sixes++;
  return sixes >= 2 ? 100 : 0;
}
