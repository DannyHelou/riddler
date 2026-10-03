/** Verifies class-size-paradox: class size experienced by a random student (9 classes of 10, 1 of 910). */
export const expected = 829; // students
export const kind = 'expectation' as const; // tolerance ±1% relative

const sizes = [10, 10, 10, 10, 10, 10, 10, 10, 10, 910];
const classOf: number[] = [];
sizes.forEach((s, c) => {
  for (let i = 0; i < s; i++) classOf.push(c);
});

export function simulate(): number | null {
  const student = Math.floor(Math.random() * classOf.length);
  return sizes[classOf[student]];
}
