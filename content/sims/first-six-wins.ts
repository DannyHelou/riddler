/** Verifies first-six-wins: two players alternate rolling a die, first six wins; chance the first roller wins. */
export const expected = 54.55; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  for (let turn = 0; ; turn++) {
    if (1 + Math.floor(Math.random() * 6) === 6) return turn % 2 === 0 ? 100 : 0;
  }
}
