/** Verifies north-south-trains: chance the first train after a random arrival is northbound. */
export const expected = 90; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  const t = Math.random() * 60; // minute of the hour you arrive
  // Next departure time of each line.
  const nextNorth = Math.ceil(t / 10) * 10;
  const nextSouth = Math.ceil((t - 1) / 10) * 10 + 1;
  return nextNorth < nextSouth ? 100 : 0;
}
