/** Verifies plate-pass: 10 people in a circle each pass a plate left or right at random; percent left with no plate. */
export const expected = 25; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp (returns the share of the table per trial)

const N = 10;
const got = new Int32Array(N);

export function simulate(): number | null {
  got.fill(0);
  for (let i = 0; i < N; i++) {
    const to = Math.random() < 0.5 ? (i + 1) % N : (i + N - 1) % N;
    got[to]++;
  }
  let empty = 0;
  for (let i = 0; i < N; i++) if (got[i] === 0) empty++;
  return (100 * empty) / N;
}
