/** Verifies taxi-witness-blue: chance a cab called blue by an 80%-reliable witness is blue, when 15% of cabs are blue. */
export const expected = 41.38; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  const blue = Math.random() < 0.15;
  const correct = Math.random() < 0.8;
  const saysBlue = correct ? blue : !blue;
  if (!saysBlue) return null;
  return blue ? 100 : 0;
}
