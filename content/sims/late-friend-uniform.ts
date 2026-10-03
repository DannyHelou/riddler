/** Verifies late-friend-uniform: chance a uniform 6:00–7:00 arrival comes by 6:50, given not by 6:40. */
export const expected = 50; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  const t = Math.random() * 60;
  if (t <= 40) return null;
  return t <= 50 ? 100 : 0;
}
