/** Verifies fishing-bite-wait: further wait for a bite after 20 bite-free minutes, bites as a Poisson process (mean gap 30 min). */
export const expected = 30; // min
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  // Bites in tiny time steps: each 0.01 minute has the same small chance of a bite.
  // Draw the first bite step by inversion of the geometric distribution.
  const dt = 0.01;
  const p = dt / 30;
  const steps = Math.floor(Math.log(1 - Math.random()) / Math.log(1 - p)) + 1;
  const t = steps * dt;
  if (t <= 20) return null; // you had a bite in the first 20 minutes
  return t - 20;
}
