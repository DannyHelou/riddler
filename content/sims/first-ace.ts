/** Verifies first-ace: average cards turned over to reach the first ace. */
export const expected = 10.6; // cards
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  // Positions of the 4 aces in a shuffled 52-card deck: the first one is what we want.
  const deck = Array.from({ length: 52 }, (_, i) => i < 4);
  for (let i = 51; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.indexOf(true) + 1;
}
