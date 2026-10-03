/** Verifies monty-hall: chance of winning the car by always switching. */
export const expected = 66.67; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  const car = Math.floor(Math.random() * 3);
  const pick = Math.floor(Math.random() * 3);
  // The host opens a goat door that isn't the pick (at random if he has a choice).
  const options = [0, 1, 2].filter((d) => d !== pick && d !== car);
  const opened = options[Math.floor(Math.random() * options.length)];
  const switched = [0, 1, 2].find((d) => d !== pick && d !== opened)!;
  return switched === car ? 100 : 0;
}
