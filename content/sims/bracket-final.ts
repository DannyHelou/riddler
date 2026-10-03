/** Verifies bracket-final: random 8-player bracket, better player always wins; chance the top two meet in the final. */
export const expected = 57.14; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  let round = [0, 1, 2, 3, 4, 5, 6, 7]; // lower number = better player
  for (let i = 7; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [round[i], round[j]] = [round[j], round[i]];
  }
  while (round.length > 2) {
    const next: number[] = [];
    for (let i = 0; i < round.length; i += 2) next.push(Math.min(round[i], round[i + 1]));
    round = next;
  }
  return round[0] + round[1] === 1 ? 100 : 0; // finalists are players 0 and 1
}
