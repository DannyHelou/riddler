/**
 * Word-answer normalization (§7.5 step 1). Shared by the judge, the seed
 * validator, and the crowd "top answers" grouping.
 */

const ARTICLES = /^(a|an|the)(\s+|$)/;

/** Naive singularization: pianos → piano, boxes → box, berries → berry. */
function singular(word: string): string {
  if (word.length <= 3) return word;
  if (/(ss|us|is)$/.test(word)) return word;
  if (/ies$/.test(word) && word.length > 4) return word.slice(0, -3) + 'y';
  if (/(ches|shes|xes|zes|sses)$/.test(word)) return word.slice(0, -2);
  if (/s$/.test(word)) return word.slice(0, -1);
  return word;
}

export function normalizeWord(input: string): string {
  let s = (input ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Strip any number of leading articles ("the a piano" is silly but harmless).
  while (ARTICLES.test(s)) s = s.replace(ARTICLES, '');
  return s
    .split(' ')
    .filter(Boolean)
    .map(singular)
    .join(' ');
}

/** Levenshtein distance with an early exit above `max`. */
export function editDistance(a: string, b: string, max = Infinity): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}
