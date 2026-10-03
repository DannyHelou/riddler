/** Verifies three-cards-colors: draw one of red/red, white/white, red/white cards and see a random face; given red, chance the back is red. */
export const expected = 66.67; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

const cards: [string, string][] = [
  ['R', 'R'],
  ['W', 'W'],
  ['R', 'W'],
];

export function simulate(): number | null {
  const card = cards[Math.floor(Math.random() * 3)];
  const side = Math.random() < 0.5 ? 0 : 1;
  if (card[side] !== 'R') return null; // condition: we see red
  return card[1 - side] === 'R' ? 100 : 0;
}
