/** Verifies hundred-flips-fifty: 100 fair coin flips; chance of exactly 50 heads. */
export const expected = 7.96; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  let heads = 0;
  for (let i = 0; i < 100; i++) if (Math.random() < 0.5) heads++;
  return heads === 50 ? 100 : 0;
}
