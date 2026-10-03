/** Verifies three-coins-match: chance three fair coins all land the same way up. */
export const expected = 25; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  const a = Math.random() < 0.5;
  const b = Math.random() < 0.5;
  const c = Math.random() < 0.5;
  return a === b && b === c ? 100 : 0;
}
