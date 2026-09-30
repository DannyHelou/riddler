/**
 * Word-matching pipeline (§7.5): normalize → cache → exact/typo → embeddings → LLM.
 * Server only. Every verdict except an LLM failure is cached so identical
 * inputs always get identical verdicts.
 */
import { normalizeWord, editDistance } from './normalize';
import { cosine, type EmbedFn } from './embed';
import type { JudgeFn } from './judge';
import type { AnswerEmbedding, Riddle, WordVerdict, WordVerdictRow } from './types';

export const MAX_WORD_INPUT = 40;

/** Open decision (§12): tune with `npm run tune-judge`. */
export const JUDGE_THRESHOLDS = {
  match: 0.88, // s >= match and margin → decide
  margin: 0.05,
  floor: 0.6, // max(sa, st) < floor → wrong
};

export type WordSource = 'exact' | 'typo' | 'embedding' | 'llm' | 'cache' | 'llm_error';

export interface WordJudgement {
  verdict: WordVerdict;
  source: WordSource;
  normalized: string;
  simAccepted: number | null;
  simTrap: number | null;
  /** The accepted answer it matched, when known. */
  matched: string | null;
  cached: boolean;
}

export interface WordJudgeDeps {
  getCached(riddleId: string, normalized: string): Promise<WordVerdictRow | null>;
  putCached(row: WordVerdictRow): Promise<WordVerdictRow>;
  getAnswerEmbeddings(riddleId: string): Promise<AnswerEmbedding[]>;
  embed: EmbedFn;
  judge: JudgeFn;
  thresholds?: typeof JUDGE_THRESHOLDS;
}

export class EmptyAnswerError extends Error {
  constructor() {
    super('Type an answer');
  }
}

/** Exact or one-typo match against a list; returns the matched original answer. */
function listMatch(norm: string, list: string[]): { hit: string; typo: boolean } | null {
  for (const a of list) if (normalizeWord(a) === norm) return { hit: a, typo: false };
  if (norm.length >= 5) {
    for (const a of list) if (editDistance(normalizeWord(a), norm, 1) <= 1) return { hit: a, typo: true };
  }
  return null;
}

/** Answer embeddings for a riddle, computing them on the fly if the seed hasn't stored any. */
async function answerVectors(riddle: Riddle, deps: WordJudgeDeps, dim: number) {
  const stored = await deps.getAnswerEmbeddings(riddle.id);
  // Reuse stored vectors only if they came from an embedder with the same dimension.
  if (stored.length && stored.every((e) => e.embedding.length === dim)) return stored;
  const acc = riddle.accepted_answers ?? [];
  const trap = riddle.trap_answers ?? [];
  const vecs = await deps.embed([...acc, ...trap].map(normalizeWord));
  return [
    ...acc.map((text, i) => ({ riddle_id: riddle.id, kind: 'accepted' as const, text, embedding: vecs[i] })),
    ...trap.map((text, i) => ({ riddle_id: riddle.id, kind: 'trap' as const, text, embedding: vecs[acc.length + i] })),
  ];
}

export async function judgeWord(riddle: Riddle, rawInput: string, deps: WordJudgeDeps): Promise<WordJudgement> {
  const th = deps.thresholds ?? JUDGE_THRESHOLDS;
  const capped = (rawInput ?? '').slice(0, MAX_WORD_INPUT);
  const norm = normalizeWord(capped);
  if (!norm) throw new EmptyAnswerError();

  // 2. Cache
  const hit = await deps.getCached(riddle.id, norm);
  if (hit) {
    return { verdict: hit.verdict, source: 'cache', normalized: norm, simAccepted: hit.sim_accepted, simTrap: hit.sim_trap, matched: null, cached: true };
  }

  const save = async (j: Omit<WordJudgement, 'cached' | 'normalized'>): Promise<WordJudgement> => {
    // First writer wins: if a concurrent request cached a verdict, return that one.
    const row = await deps.putCached({ riddle_id: riddle.id, normalized_input: norm, verdict: j.verdict, source: j.source, sim_accepted: j.simAccepted, sim_trap: j.simTrap });
    return { ...j, verdict: row.verdict, normalized: norm, cached: false };
  };

  // 3. Exact, then typo
  const accepted = riddle.accepted_answers ?? [];
  const traps = riddle.trap_answers ?? [];
  const accExact = listMatch(norm, accepted);
  const trapExact = listMatch(norm, traps);
  if (accExact && !accExact.typo) return save({ verdict: 'correct', source: 'exact', simAccepted: 1, simTrap: null, matched: accExact.hit });
  if (trapExact && !trapExact.typo) return save({ verdict: 'trapped', source: 'exact', simAccepted: null, simTrap: 1, matched: null });
  if (accExact && !trapExact) return save({ verdict: 'correct', source: 'typo', simAccepted: null, simTrap: null, matched: accExact.hit });
  if (trapExact && !accExact) return save({ verdict: 'trapped', source: 'typo', simAccepted: null, simTrap: null, matched: null });

  // 4. Embedding similarity
  let sa = 0;
  let st = 0;
  let bestAcc: string | null = null;
  try {
    const [vec] = await deps.embed([norm]);
    for (const e of await answerVectors(riddle, deps, vec.length)) {
      const s = cosine(vec, e.embedding);
      if (e.kind === 'accepted' && s > sa) {
        sa = s;
        bestAcc = e.text;
      }
      if (e.kind === 'trap' && s > st) st = s;
    }
  } catch {
    // Embedding outage: fall through to the LLM with unknown similarity.
    sa = st = NaN;
  }
  if (!Number.isNaN(sa)) {
    if (sa >= th.match && sa - st >= th.margin) return save({ verdict: 'correct', source: 'embedding', simAccepted: sa, simTrap: st, matched: bestAcc });
    if (st >= th.match && st - sa >= th.margin) return save({ verdict: 'trapped', source: 'embedding', simAccepted: sa, simTrap: st, matched: null });
    if (Math.max(sa, st) < th.floor) return save({ verdict: 'wrong', source: 'embedding', simAccepted: sa, simTrap: st, matched: null });
  }

  // 5. LLM judge for close calls
  const simA = Number.isNaN(sa) ? null : sa;
  const simT = Number.isNaN(st) ? null : st;
  try {
    const verdict = await deps.judge({ prompt: riddle.prompt_md, canonical: riddle.answer_display, accepted, traps, playerAnswer: capped });
    return save({ verdict, source: 'llm', simAccepted: simA, simTrap: simT, matched: verdict === 'correct' ? bestAcc : null });
  } catch {
    // Timeout or API error → wrong, and do NOT cache so a later identical input can retry.
    return { verdict: 'wrong', source: 'llm_error', normalized: norm, simAccepted: simA, simTrap: simT, matched: null, cached: false };
  }
}
