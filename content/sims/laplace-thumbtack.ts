/** Verifies laplace-thumbtack: chance of a 4th point-up after 3, with the tack bias uniform on [0, 1]. */
export const expected = 80; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  const p = Math.random();
  for (let i = 0; i < 3; i++) if (Math.random() >= p) return null;
  return Math.random() < p ? 100 : 0;
}
