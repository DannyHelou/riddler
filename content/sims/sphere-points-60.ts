/** Verifies sphere-points-60: chance two uniform points on a sphere are less than 60 degrees apart. */
export const expected = 25; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

function randomUnitVector(): [number, number, number] {
  // Rejection sampling from the cube, then normalize.
  for (;;) {
    const x = Math.random() * 2 - 1;
    const y = Math.random() * 2 - 1;
    const z = Math.random() * 2 - 1;
    const r2 = x * x + y * y + z * z;
    if (r2 > 1e-9 && r2 <= 1) {
      const r = Math.sqrt(r2);
      return [x / r, y / r, z / r];
    }
  }
}

export function simulate(): number | null {
  const a = randomUnitVector();
  const b = randomUnitVector();
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return dot > 0.5 ? 100 : 0; // cos 60 degrees = 0.5
}
