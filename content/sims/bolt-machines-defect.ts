/** Verifies bolt-machines-defect: share of faulty bolts that come from machine B. */
export const expected = 50; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  const fromB = Math.random() < 0.2;
  const faulty = Math.random() < (fromB ? 0.04 : 0.01);
  if (!faulty) return null;
  return fromB ? 100 : 0;
}
