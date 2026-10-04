/**
 * Embeddings behind one `embed()` interface (§7.5 step 4). Server only.
 *
 * A local, deterministic hashed character n-gram embedding (512-d). Owner decision 2026-10-03:
 * no embedding provider. Live tests scored 99.7% with this plus Jev for close calls, and one
 * embedder everywhere means seeded and live vectors always match.
 */
export const EMBED_DIM = 512;
export type EmbedFn = (texts: string[]) => Promise<number[][]>;

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Offline stand-in: hashed character trigrams plus whole words, L2-normalized. */
export function localEmbed(text: string): number[] {
  const v = new Array<number>(EMBED_DIM).fill(0);
  const s = ` ${text.toLowerCase().trim()} `;
  for (let i = 0; i < s.length - 2; i++) {
    const h = fnv1a(s.slice(i, i + 3));
    v[h % EMBED_DIM] += h & 0x80000000 ? -1 : 1;
  }
  for (const w of text.toLowerCase().split(/\s+/).filter(Boolean)) {
    const h = fnv1a(`w:${w}`);
    v[h % EMBED_DIM] += 2 * (h & 0x80000000 ? -1 : 1);
  }
  const n = Math.sqrt(v.reduce((a, x) => a + x * x, 0)) || 1;
  return v.map((x) => x / n);
}

export const localEmbedder: EmbedFn = async (texts) => texts.map(localEmbed);

export function defaultEmbedder(): { embed: EmbedFn; name: string } {
  return { embed: localEmbedder, name: 'local-ngram' };
}
