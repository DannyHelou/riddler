/** Verifies knight-return: random knight walk from a corner of an 8x8 board; average moves to return to the corner. */
export const expected = 168; // moves
export const kind = 'expectation' as const; // tolerance ±1% relative

const nbrs: number[][] = [];
for (let r = 0; r < 8; r++) {
  for (let c = 0; c < 8; c++) {
    const list: number[] = [];
    for (const [dr, dc] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) list.push(rr * 8 + cc);
    }
    nbrs.push(list);
  }
}

export function simulate(): number | null {
  let sq = 0;
  let moves = 0;
  do {
    const n = nbrs[sq];
    sq = n[Math.floor(Math.random() * n.length)];
    moves++;
  } while (sq !== 0);
  return moves;
}
