/** Verifies spinner-which-one: chance the spinner was A (uniform 0–1, not B uniform 0–3) given spins near 0.7 and 0.4. */
export const expected = 90; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  const isA = Math.random() < 0.5;
  const range = isA ? 1 : 3;
  const s1 = Math.random() * range;
  const s2 = Math.random() * range;
  // Condition on spins within 0.1 of 0.7 and 0.4 (both densities are flat there).
  if (Math.abs(s1 - 0.7) > 0.1 || Math.abs(s2 - 0.4) > 0.1) return null;
  return isA ? 100 : 0;
}
