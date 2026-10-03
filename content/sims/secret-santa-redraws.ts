/** Verifies secret-santa-redraws: 4 people draw names at random; redraw everything if anyone gets their own. Average draws. */
export const expected = 2.667; // draws
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  const hat = [0, 1, 2, 3];
  for (let draws = 1; ; draws++) {
    for (let i = 3; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [hat[i], hat[j]] = [hat[j], hat[i]];
    }
    if (hat[0] !== 0 && hat[1] !== 1 && hat[2] !== 2 && hat[3] !== 3) return draws;
  }
}
