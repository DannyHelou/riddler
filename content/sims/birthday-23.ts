/** Verifies birthday-23: chance that at least two of 23 people share a birthday. */
export const expected = 50.73; // percent
export const kind = 'probability' as const;

export function simulate(): number | null {
  const seen = new Set<number>();
  for (let i = 0; i < 23; i++) {
    const day = Math.floor(Math.random() * 365);
    if (seen.has(day)) return 100;
    seen.add(day);
  }
  return 0;
}
