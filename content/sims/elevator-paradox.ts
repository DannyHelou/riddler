/** Verifies elevator-paradox: chance a shuttling elevator (floors 1–10) next reaches floor 2 going down. */
export const expected = 88.89; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  // Random moment in an 18-unit round trip: up from floor 1 to 10, then down.
  const t = Math.random() * 18;
  const goingUp = t < 9;
  const floor = goingUp ? 1 + t : 19 - t;
  // Going up: reaches floor 2 going up only if still below it; otherwise tops out and comes down.
  // Going down: reaches floor 2 going down if still above it; otherwise bottoms out and comes up.
  const arrivesDown = goingUp ? floor >= 2 : floor > 2;
  return arrivesDown ? 100 : 0;
}
