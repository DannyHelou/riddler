/** Verifies bus-wait: average wait for random buses that come once every 10 minutes on average. */
export const expected = 10; // minutes
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  // Run the bus process from time 0 and arrive at a random moment well after the start.
  const arrive = 100 + Math.random() * 1000;
  let t = 0;
  while (t <= arrive) t += -10 * Math.log(1 - Math.random());
  return t - arrive;
}
