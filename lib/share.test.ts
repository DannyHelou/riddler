import { describe, expect, it } from 'vitest';
import { shareText } from './share';

describe('share text (§5.7)', () => {
  const rows = [
    { tier: 'warmup' as const, answerType: 'word' as const, ladderLevel: null, verdict: 'correct' as const, trapped: false, timeBonus: 30 },
    { tier: 'trap' as const, answerType: 'number' as const, ladderLevel: 'Goldfish', verdict: null, trapped: true, timeBonus: 0 },
    { tier: 'boss' as const, answerType: 'number' as const, ladderLevel: 'Genius', verdict: null, trapped: false, timeBonus: 10 },
  ];

  it('matches the brief example exactly', () => {
    expect(shareText({ puzzleNumber: 58, rq: 118, rows })).toBe(
      'Riddler #58 — RQ 118\n🟢 ✅⚡\n🟡 🪤🐟\n🔴 🧠\nriddlerr.com',
    );
  });

  it('says Early RQ while the RQ is an estimate', () => {
    const t = shareText({ puzzleNumber: 3, rq: 112, rqEstimated: true, rows: [rows[2]] });
    expect(t).toBe('Riddler #3 — Early RQ 112\n🔴 🧠\nriddlerr.com');
  });

  it('never contains answers', () => {
    const t = shareText({ puzzleNumber: 58, rq: 118, rows });
    expect(t).not.toMatch(/piano|9%|flips/i);
  });
});
