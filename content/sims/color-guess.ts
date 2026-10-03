/** Verifies color-guess: 3 red + 3 black shuffled; guess the majority color left (coin flip on ties). Average correct guesses. */
export const expected = 4.1; // cards
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  const deck = [0, 0, 0, 1, 1, 1]; // 0 red, 1 black
  for (let i = 5; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  let red = 3;
  let black = 3;
  let right = 0;
  for (const card of deck) {
    const guess = red > black ? 0 : black > red ? 1 : Math.random() < 0.5 ? 0 : 1;
    if (guess === card) right++;
    if (card === 0) red--;
    else black--;
  }
  return right;
}
