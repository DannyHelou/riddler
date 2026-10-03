/** Verifies round-robin-unbeaten: 4 teams, 6 coin-flip games; chance some team wins all 3 of its games. */
export const expected = 50; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  const wins = [0, 0, 0, 0];
  for (let a = 0; a < 4; a++) {
    for (let b = a + 1; b < 4; b++) wins[Math.random() < 0.5 ? a : b]++;
  }
  return wins.includes(3) ? 100 : 0;
}
