/** Verifies commute-random-speed: average minutes to drive 30 km at a uniform random speed in [30, 90] km/h. */
export const expected = 32.96; // min
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  const speed = 30 + Math.random() * 60;
  return (30 / speed) * 60;
}
