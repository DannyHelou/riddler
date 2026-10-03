/** Verifies traffic-light-wait: average wait at a 40 s green / 20 s red light for a random arrival. */
export const expected = 3.333; // s
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  const t = Math.random() * 60;
  return t < 40 ? 0 : 60 - t;
}
