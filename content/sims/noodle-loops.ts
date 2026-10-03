/** Verifies noodle-loops: average loops from tying random ends of 100 noodles. */
export const expected = 3.284; // loops
export const kind = 'expectation' as const; // tolerance ±1% relative

export function simulate(): number | null {
  // Each end has an id; partner[e] is the other end of the same strand (a noodle or chain of noodles).
  const n = 100;
  const partner = new Int32Array(2 * n);
  for (let i = 0; i < n; i++) {
    partner[2 * i] = 2 * i + 1;
    partner[2 * i + 1] = 2 * i;
  }
  const loose = Array.from({ length: 2 * n }, (_, i) => i);
  // Remove a random loose end in O(1): swap it with the last one and pop.
  const take = () => {
    const i = Math.floor(Math.random() * loose.length);
    const e = loose[i];
    loose[i] = loose[loose.length - 1];
    loose.pop();
    return e;
  };
  let loops = 0;
  while (loose.length) {
    const a = take();
    const b = take();
    if (partner[a] === b) {
      loops++; // tied the two ends of one strand
    } else {
      const pa = partner[a];
      const pb = partner[b];
      partner[pa] = pb;
      partner[pb] = pa;
    }
  }
  return loops;
}
