/** Spoiler-free share text (§5.7). Never includes answers or riddle text. */
import type { AnswerType, AnswerVerdict, Tier } from './types';
import { TIER_EMOJI } from './types';

export const LEVEL_EMOJI: Record<string, string> = {
  Goldfish: '🐟',
  Guesser: '🎲',
  Analyst: '📊',
  Quant: '📈',
  Genius: '🧠',
  Oracle: '🔮',
};

export interface ShareRow {
  tier: Tier;
  answerType: AnswerType;
  ladderLevel: string | null;
  verdict: AnswerVerdict | null;
  trapped: boolean;
  timeBonus: number;
}

export function shareLine(r: ShareRow): string {
  let mark: string;
  if (r.answerType === 'word') {
    mark = r.verdict === 'correct' ? '✅' : r.verdict === 'trapped' ? '🪤' : '❌';
  } else {
    mark = (r.trapped ? '🪤' : '') + (LEVEL_EMOJI[r.ladderLevel ?? 'Goldfish'] ?? '🐟');
  }
  return `${TIER_EMOJI[r.tier]} ${mark}${r.timeBonus >= 25 ? '⚡' : ''}`;
}

export function shareText(opts: { puzzleNumber: number; rq: number | null; rows: ShareRow[]; domain?: string }): string {
  const head = `Riddler #${opts.puzzleNumber} — ${opts.rq === null ? 'Early bird.' : `RQ ${opts.rq}`}`;
  return [head, ...opts.rows.map(shareLine), opts.domain ?? 'riddlerr.com'].join('\n');
}
