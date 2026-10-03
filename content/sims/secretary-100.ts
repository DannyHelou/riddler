/** Verifies secretary-100: chance the skip-37-then-take-the-first-record rule hires the best of 100 (the optimal rule, P = 37.10%). */
export const expected = 37.1; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

const N = 100;
const SKIP = 37;
const ranks = Array.from({ length: N }, (_, i) => i); // 0 = worst, N - 1 = best

export function simulate(): number | null {
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = ranks[i];
    ranks[i] = ranks[j];
    ranks[j] = t;
  }
  let bar = -1;
  for (let i = 0; i < SKIP; i++) bar = Math.max(bar, ranks[i]);
  for (let i = SKIP; i < N; i++) {
    if (ranks[i] > bar) return ranks[i] === N - 1 ? 100 : 0;
  }
  return 0; // never hired anyone
}
