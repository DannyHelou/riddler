/** Verifies friendship-paradox-club: friend count of a random friend of a random member in a star-shaped club. */
export const expected = 8.2; // friends
export const kind = 'expectation' as const; // tolerance ±1% relative

const friends: number[][] = [[1, 2, 3, 4, 5, 6, 7, 8, 9], [0], [0], [0], [0], [0], [0], [0], [0], [0]];

export function simulate(): number | null {
  const m = Math.floor(Math.random() * 10);
  const list = friends[m];
  const f = list[Math.floor(Math.random() * list.length)];
  return friends[f].length;
}
