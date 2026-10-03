/** Verifies lamp-race-three: chance the mean-3 exponential lamp outlasts mean-1 and mean-2 lamps. */
export const expected = 53.18; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

function expo(mean: number): number {
  return -mean * Math.log(1 - Math.random());
}

export function simulate(): number | null {
  const a = expo(1);
  const b = expo(2);
  const c = expo(3);
  return c > a && c > b ? 100 : 0;
}
