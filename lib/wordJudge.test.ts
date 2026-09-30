import { describe, expect, it, vi } from 'vitest';
import { judgeWord, EmptyAnswerError, type WordJudgeDeps } from './wordJudge';
import { normalizeWord } from './normalize';
import { localEmbedder } from './embed';
import { parseJudgeReply, type JudgeInput } from './judge';
import type { Riddle, WordVerdictRow } from './types';
import keys from '../content/riddles/keys-no-locks.json';

const riddle = keys as unknown as Riddle;

function deps(judge: WordJudgeDeps['judge']) {
  const cache = new Map<string, WordVerdictRow>();
  const d: WordJudgeDeps = {
    getCached: async (r, n) => cache.get(`${r}|${n}`) ?? null,
    putCached: async (row) => {
      const k = `${row.riddle_id}|${row.normalized_input}`;
      if (!cache.has(k)) cache.set(k, row);
      return cache.get(k)!;
    },
    getAnswerEmbeddings: async () => [],
    embed: localEmbedder,
    judge,
  };
  return { d, cache };
}

describe('normalize (§7.5 step 1)', () => {
  it('lowercases, strips punctuation and articles, singularizes', () => {
    expect(normalizeWord('  The  Pianos!! ')).toBe('piano');
    expect(normalizeWord('a Key-Ring')).toBe('key ring');
    expect(normalizeWord('An upright piano.')).toBe('upright piano');
  });
});

describe('judgeWord (§7.5)', () => {
  it('settles exact and typo matches without the LLM', async () => {
    const judge = vi.fn();
    const { d } = deps(judge);
    expect((await judgeWord(riddle, 'The Piano', d)).verdict).toBe('correct');
    expect((await judgeWord(riddle, 'pianos', deps(judge).d)).source).toBe('exact');
    expect(await judgeWord(riddle, 'pianno', d)).toMatchObject({ verdict: 'correct', source: 'typo' });
    expect(await judgeWord(riddle, 'key chain', d)).toMatchObject({ verdict: 'trapped', source: 'typo' });
    expect(await judgeWord(riddle, 'keychain', d)).toMatchObject({ verdict: 'trapped', source: 'exact' });
    expect(judge).not.toHaveBeenCalled();
  });

  it('rejects empty input', async () => {
    const { d } = deps(vi.fn());
    await expect(judgeWord(riddle, '  the ', d)).rejects.toBeInstanceOf(EmptyAnswerError);
  });

  it('gives identical inputs identical verdicts via the cache', async () => {
    let n = 0;
    // A deliberately flaky judge: flips its answer on every call.
    const judge = vi.fn(async () => (n++ % 2 === 0 ? ('correct' as const) : ('wrong' as const)));
    const { d } = deps(judge);
    const thresholds = { match: 2, margin: 0, floor: -1 }; // force every non-exact input to the LLM
    const a = await judgeWord(riddle, 'computer keyboard', { ...d, thresholds });
    const b = await judgeWord(riddle, 'Computer  Keyboard!', { ...d, thresholds });
    expect(a.verdict).toBe('correct');
    expect(b).toMatchObject({ verdict: 'correct', source: 'cache' });
    expect(judge).toHaveBeenCalledTimes(1);
  });

  it('returns wrong on LLM failure and does not cache it', async () => {
    const judge = vi.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce('correct');
    const { d, cache } = deps(judge);
    const thresholds = { match: 2, margin: 0, floor: -1 };
    const a = await judgeWord(riddle, 'musical keyboard', { ...d, thresholds });
    expect(a).toMatchObject({ verdict: 'wrong', source: 'llm_error', cached: false });
    expect(cache.size).toBe(0);
    const b = await judgeWord(riddle, 'musical keyboard', { ...d, thresholds });
    expect(b.verdict).toBe('correct');
    expect(cache.size).toBe(1);
  });

  it('caps input at 40 characters before any API call', async () => {
    const judge = vi.fn(async (_i: JudgeInput) => 'wrong' as const);
    const { d } = deps(judge);
    await judgeWord(riddle, 'x'.repeat(100), { ...d, thresholds: { match: 2, margin: 0, floor: -1 } });
    expect(judge.mock.calls[0]![0].playerAnswer.length).toBe(40);
  });
});

describe('parseJudgeReply', () => {
  it('only accepts one of the three labels', () => {
    expect(parseJudgeReply('{"verdict": "correct"}')).toBe('correct');
    expect(parseJudgeReply(' {"verdict":"trapped"} ')).toBe('trapped');
    expect(parseJudgeReply('{"verdict": "Correct"}')).toBe('wrong');
    expect(parseJudgeReply('correct')).toBe('wrong');
    expect(parseJudgeReply('{"verdict": "correct", "note": 1}')).toBe('wrong');
  });
});
