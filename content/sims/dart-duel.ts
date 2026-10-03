/** Verifies dart-duel: chance the first of two alternating dart throwers lands within half the radius first. */
export const expected = 57.14; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

function dartHits(): boolean {
  for (;;) {
    const x = Math.random() * 2 - 1;
    const y = Math.random() * 2 - 1;
    const r2 = x * x + y * y;
    if (r2 <= 1) return r2 < 0.25; // within half the radius
  }
}

export function simulate(): number | null {
  for (let turn = 0; ; turn++) {
    if (dartHits()) return turn % 2 === 0 ? 100 : 0;
  }
}
