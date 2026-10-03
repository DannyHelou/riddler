/** Verifies pawn-track: simple random walk from 5 on 0..10; average steps to hit 0 or 10. */
export const expected = 25; // turns
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  let pos = 5;
  let turns = 0;
  while (pos > 0 && pos < 10) {
    pos += Math.random() < 0.5 ? 1 : -1;
    turns++;
  }
  return turns;
}
