/** Verifies relay-delays-total: chance the sum of three mean-1 exponential delays is under 3. */
export const expected = 57.68; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

function expo(mean: number): number {
  return -mean * Math.log(1 - Math.random());
}

export function simulate(): number | null {
  return expo(1) + expo(1) + expo(1) < 3 ? 100 : 0;
}
