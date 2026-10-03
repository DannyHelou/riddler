/** Verifies polya-urn: start 1 red, 1 blue; draw, return with one more of that color, until 100 marbles. Chance exactly 50 red. */
export const expected = 1.01; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  let red = 1;
  let total = 2;
  while (total < 100) {
    if (Math.random() * total < red) red++;
    total++;
  }
  return red === 50 ? 100 : 0;
}
