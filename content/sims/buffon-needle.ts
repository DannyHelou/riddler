/** Verifies buffon-needle: chance a 10 cm needle dropped on lines 10 cm apart crosses one. */
export const expected = 63.66; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

function randomDirection(): [number, number] {
  // Uniform direction in the plane: rejection sample the unit disk, then normalize.
  for (;;) {
    const x = Math.random() * 2 - 1;
    const y = Math.random() * 2 - 1;
    const r2 = x * x + y * y;
    if (r2 > 1e-12 && r2 <= 1) {
      const r = Math.sqrt(r2);
      return [x / r, y / r];
    }
  }
}

export function simulate(): number | null {
  const y = Math.random() * 10; // needle center, distance above the line below it
  const [, dy] = randomDirection();
  const half = 5 * Math.abs(dy); // vertical reach of each half of the needle
  return y < half || 10 - y < half ? 100 : 0;
}
