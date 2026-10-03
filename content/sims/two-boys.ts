/** Verifies two-boys: share of two-child families with at least one boy that have two boys. */
export const expected = 33.33; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  const a = Math.random() < 0.5;
  const b = Math.random() < 0.5; // true = boy
  if (!a && !b) return null; // condition: at least one boy
  return a && b ? 100 : 0;
}
