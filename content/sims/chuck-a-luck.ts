/**
 * Verifies chuck-a-luck: bet 1 on a number, roll 3 dice, win 1 per matching die, lose the stake if none match.
 * Each trial returns the player's loss as a percent of the bet; the mean is the house edge.
 */
export const expected = 7.87; // percent of the bet
export const kind = 'probability' as const; // tolerance ±0.5 pp (per-game sd ~110, so standard error ~0.11)

export function simulate(): number | null {
  const mine = 1 + Math.floor(Math.random() * 6);
  let matches = 0;
  for (let i = 0; i < 3; i++) if (1 + Math.floor(Math.random() * 6) === mine) matches++;
  const win = matches === 0 ? -1 : matches;
  return -win * 100;
}
