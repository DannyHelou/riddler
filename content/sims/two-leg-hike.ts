/** Verifies two-leg-hike: chance two unit steps in independent uniform directions end more than 1 from the start. */
export const expected = 66.67; // percent
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
  const [ax, ay] = randomDirection();
  const [bx, by] = randomDirection();
  return Math.hypot(ax + bx, ay + by) > 1 ? 100 : 0;
}
