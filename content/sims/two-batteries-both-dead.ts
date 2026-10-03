/** Verifies two-batteries-both-dead: average time until both of two exponential (mean 1,000 h) batteries are dead. */
export const expected = 1500; // h
export const kind = 'expectation' as const; // tolerance ±1% relative

function expo(mean: number): number {
  return -mean * Math.log(1 - Math.random());
}

export function simulate(): number | null {
  return Math.max(expo(1000), expo(1000));
}
