/** Verifies tetrahedron-center: chance four uniform points on a sphere span a tetrahedron containing the center. */
export const expected = 12.5; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

function randomUnitVector(): [number, number, number] {
  // Uniform point on the sphere: rejection sample the unit ball, then normalize.
  for (;;) {
    const x = Math.random() * 2 - 1;
    const y = Math.random() * 2 - 1;
    const z = Math.random() * 2 - 1;
    const r2 = x * x + y * y + z * z;
    if (r2 > 1e-12 && r2 <= 1) {
      const r = Math.sqrt(r2);
      return [x / r, y / r, z / r];
    }
  }
}

type V = [number, number, number];

function orient(p: V, q: V, r: V, s: V): number {
  const ax = q[0] - p[0], ay = q[1] - p[1], az = q[2] - p[2];
  const bx = r[0] - p[0], by = r[1] - p[1], bz = r[2] - p[2];
  const cx = s[0] - p[0], cy = s[1] - p[1], cz = s[2] - p[2];
  return ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
}

export function simulate(): number | null {
  const v: V[] = [randomUnitVector(), randomUnitVector(), randomUnitVector(), randomUnitVector()];
  const o: V = [0, 0, 0];
  // The center is inside iff, for every face, it lies on the same side as the opposite vertex.
  for (let i = 0; i < 4; i++) {
    const f = v.filter((_, j) => j !== i);
    const sideVertex = orient(f[0], f[1], f[2], v[i]);
    const sideCenter = orient(f[0], f[1], f[2], o);
    if (sideVertex * sideCenter <= 0) return 0;
  }
  return 100;
}
