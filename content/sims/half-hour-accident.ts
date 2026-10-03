/** Verifies half-hour-accident: chance of an accident in half an hour when the hourly chance is 75%. */
export const expected = 50; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  // Accidents form a Poisson process; P(at least one per hour) = 0.75 gives rate ln 4 per hour.
  const rate = Math.log(4);
  const first = -Math.log(1 - Math.random()) / rate; // hours until the first accident
  return first < 0.5 ? 100 : 0;
}
