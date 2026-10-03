/** Verifies deuce-tennis: from deuce, first to lead by two points wins; server wins each point with chance 60%. */
export const expected = 69.23; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  let lead = 0;
  while (Math.abs(lead) < 2) lead += Math.random() < 0.6 ? 1 : -1;
  return lead === 2 ? 100 : 0;
}
