/** Verifies knockout-meet: random 16-player bracket, coin-flip matches; chance players 0 and 1 ever play each other. */
export const expected = 12.5; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  let round = Array.from({ length: 16 }, (_, i) => i);
  for (let i = 15; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [round[i], round[j]] = [round[j], round[i]];
  }
  while (round.length > 1) {
    const next: number[] = [];
    for (let i = 0; i < round.length; i += 2) {
      const a = round[i];
      const b = round[i + 1];
      if (a + b === 1) return 100; // players 0 and 1 meet
      next.push(Math.random() < 0.5 ? a : b);
    }
    round = next;
  }
  return 0;
}
