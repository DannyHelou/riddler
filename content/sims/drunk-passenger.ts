/** Verifies drunk-passenger: chance the last of 100 passengers gets their own seat. */
export const expected = 50; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  const n = 100;
  const free = new Set<number>(Array.from({ length: n }, (_, i) => i));
  const takeRandom = () => {
    const seats = [...free];
    free.delete(seats[Math.floor(Math.random() * seats.length)]);
  };
  takeRandom(); // passenger 0 lost their pass
  for (let p = 1; p < n - 1; p++) {
    if (free.has(p)) free.delete(p);
    else takeRandom();
  }
  return free.has(n - 1) ? 100 : 0;
}
