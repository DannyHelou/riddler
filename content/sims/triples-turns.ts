/** Verifies triples-turns: roll three dice per turn; average turns until all three match. */
export const expected = 36; // turns
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  const roll = () => 1 + Math.floor(Math.random() * 6);
  for (let turn = 1; ; turn++) {
    const a = roll();
    const b = roll();
    const c = roll();
    if (a === b && b === c) return turn;
  }
}
