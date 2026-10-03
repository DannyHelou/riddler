/** Verifies even-before-six: roll until the first six; given no odd roll came up, average number of rolls. */
export const expected = 1.5; // rolls
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  for (let n = 1; ; n++) {
    const r = 1 + Math.floor(Math.random() * 6);
    if (r === 6) return n;
    if (r % 2 === 1) return null; // condition: no odd numbers before the six (discard trial)
  }
}
