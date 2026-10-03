/** Verifies post-office-last: chance you leave last when you queue behind two busy tellers with exponential service. */
export const expected = 50; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

function expo(mean: number): number {
  return -mean * Math.log(1 - Math.random());
}

export function simulate(): number | null {
  const a = expo(1); // remaining time of customer at teller 1
  const b = expo(1); // remaining time of customer at teller 2
  const start = Math.min(a, b);
  const you = start + expo(1);
  return you > Math.max(a, b) ? 100 : 0;
}
