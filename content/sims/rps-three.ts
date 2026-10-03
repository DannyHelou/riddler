/** Verifies rps-three: random rock-paper-scissors among 3; with exactly two kinds of throw the beaten drop out. Average rounds to one player. */
export const expected = 2.25; // rounds
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  let players = 3;
  let rounds = 0;
  while (players > 1) {
    rounds++;
    const t: number[] = [];
    for (let i = 0; i < players; i++) t.push(Math.floor(Math.random() * 3)); // 0 rock, 1 paper, 2 scissors
    const kinds = new Set(t);
    if (kinds.size !== 2) continue;
    const [a, b] = [...kinds];
    const winner = (a + 1) % 3 === b ? b : a; // b beats a when b = a + 1 (mod 3)
    players = t.filter((x) => x === winner).length;
  }
  return rounds;
}
