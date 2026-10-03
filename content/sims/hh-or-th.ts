/** Verifies hh-or-th: flip until HH or TH appears on consecutive flips; chance HH comes first. */
export const expected = 25; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  let prev = Math.random() < 0.5; // true = heads
  for (;;) {
    const cur = Math.random() < 0.5;
    if (cur) return prev ? 100 : 0; // a head completes HH (prev heads) or TH (prev tails)
    prev = cur;
  }
}
