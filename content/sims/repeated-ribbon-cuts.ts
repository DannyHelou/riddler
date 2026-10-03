/** Verifies repeated-ribbon-cuts: average number of uniform cuts (keeping the left piece) to shrink 100 cm below 1 cm. */
export const expected = 5.605; // cuts
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  let length = 100; // cm
  let cuts = 0;
  while (length >= 1) {
    length *= Math.random();
    cuts++;
  }
  return cuts;
}
