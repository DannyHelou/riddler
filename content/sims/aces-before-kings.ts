/** Verifies aces-before-kings: deal a shuffled 52-card deck; chance all 4 aces appear before the first king. */
export const expected = 1.43; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

const deck = new Int8Array(52); // 0 = ace, 1 = king, 2 = other
for (let i = 0; i < 52; i++) deck[i] = i < 4 ? 0 : i < 8 ? 1 : 2;

export function simulate(): number | null {
  // Deal cards one at a time (lazy Fisher-Yates) until a king or the fourth ace appears.
  let aces = 0;
  for (let i = 0; i < 52; i++) {
    const j = i + Math.floor(Math.random() * (52 - i));
    const c = deck[j];
    deck[j] = deck[i];
    deck[i] = c;
    if (c === 1) return 0;
    if (c === 0 && ++aces === 4) return 100;
  }
  return 0;
}
