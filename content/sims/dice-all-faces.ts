/** Verifies dice-all-faces: average rolls to see all six faces of a die. */
export const expected = 14.7; // rolls
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  const seen = new Set<number>();
  let rolls = 0;
  while (seen.size < 6) {
    rolls++;
    seen.add(Math.floor(Math.random() * 6));
  }
  return rolls;
}
