/**
 * Verifies amoeba-extinction: each amoeba becomes 0, 1, 2 or 3 amoebas with chance 1/4 each; chance the line dies out.
 * A population above 60 is counted as surviving (it then dies out with chance 0.414^60, about 1e-23).
 */
export const expected = 41.42; // percent
export const kind = 'probability' as const; // tolerance ±0.5 pp

export function simulate(): number | null {
  let pop = 1;
  while (pop > 0 && pop <= 60) {
    let next = 0;
    for (let i = 0; i < pop; i++) next += Math.floor(Math.random() * 4);
    pop = next;
  }
  return pop === 0 ? 100 : 0;
}
