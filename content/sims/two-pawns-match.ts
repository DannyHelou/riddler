/** Verifies two-pawns-match: draw 2 of {B, B, W, W} without replacement; chance they match. */
export const expected = 33.33; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  const bag = ['B', 'B', 'W', 'W'];
  const i = Math.floor(Math.random() * 4);
  const first = bag[i];
  bag[i] = bag[3];
  bag.pop();
  const second = bag[Math.floor(Math.random() * 3)];
  return first === second ? 100 : 0;
}
