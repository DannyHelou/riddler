/** Verifies your-birthday: average strangers met until one shares your birthday. */
export const expected = 365; // strangers
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  const mine = Math.floor(Math.random() * 365);
  let met = 0;
  for (;;) {
    met++;
    if (Math.floor(Math.random() * 365) === mine) return met;
  }
}
