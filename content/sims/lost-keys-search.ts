/** Verifies lost-keys-search: chance the keys are in the kitchen after two failed 70%-effective kitchen searches. */
export const expected = 8.26; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  const kitchen = Math.random() < 0.5;
  for (let i = 0; i < 2; i++) {
    const found = kitchen && Math.random() < 0.7;
    if (found) return null; // a search succeeded: not the situation in the riddle
  }
  return kitchen ? 100 : 0;
}
