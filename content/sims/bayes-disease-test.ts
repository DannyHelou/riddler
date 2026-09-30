/** Verifies bayes-disease-test: P(sick | positive) with 1/1000 prevalence and a 99% accurate test. */
export const expected = 9.02; // same units as answer_value (percent)
export const kind = 'probability' as const; // tolerance ±0.5 percentage points

/** One conditioned trial: null = discard (the person did not test positive). */
export function simulate(): number | null {
  const sick = Math.random() < 0.001;
  const positive = sick ? Math.random() < 0.99 : Math.random() < 0.01;
  if (!positive) return null;
  return sick ? 100 : 0;
}
