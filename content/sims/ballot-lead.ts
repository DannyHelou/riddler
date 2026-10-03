/** Verifies ballot-lead: 6 winner goals and 4 loser goals in uniformly random order; chance the winners lead after every goal. */
export const expected = 20; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  const goals = [1, 1, 1, 1, 1, 1, -1, -1, -1, -1];
  for (let i = 9; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [goals[i], goals[j]] = [goals[j], goals[i]];
  }
  let margin = 0;
  for (const g of goals) {
    margin += g;
    if (margin <= 0) return 0;
  }
  return 100;
}
