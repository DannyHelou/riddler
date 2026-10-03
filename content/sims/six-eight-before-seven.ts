/** Verifies six-eight-before-seven: roll two dice repeatedly; chance both a total of 6 and of 8 appear before any 7. */
export const expected = 28.41; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  let six = false;
  let eight = false;
  for (;;) {
    const t = 2 + Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6);
    if (t === 7) return 0;
    if (t === 6) six = true;
    if (t === 8) eight = true;
    if (six && eight) return 100;
  }
}
