import { describe, expect, it } from 'vitest';
import { shareText } from './share';

describe('share text (§5.7)', () => {
  const rows = [
    { tier: 'warmup' as const, answerType: 'word' as const, ladderLevel: null, verdict: 'correct' as const, trapped: false, timeBonus: 30 },
    { tier: 'trap' as const, answerType: 'number' as const, ladderLevel: 'Goldfish', verdict: null, trapped: true, timeBonus: 0 },
    { tier: 'boss' as const, answerType: 'number' as const, ladderLevel: 'Genius', verdict: null, trapped: false, timeBonus: 10 },
  ];

  it('matches the brief example exactly', () => {
    expect(shareText({ puzzleNumber: 58, top: 12, rows })).toBe(
      'Riddler #58 — Top 12%\n🟢 ✅⚡\n🟡 🪤🐟\n🔴 🧠\nriddlerr.com',
    );
  });

  it('marks an early estimate', () => {
    const t = shareText({ puzzleNumber: 3, top: 20, estimated: true, rows: [rows[2]] });
    expect(t).toBe('Riddler #3 — Top 20% (early)\n🔴 🧠\nriddlerr.com');
  });

  it('never contains answers', () => {
    const t = shareText({ puzzleNumber: 58, top: 12, rows });
    expect(t).not.toMatch(/piano|about 9%|flips/i);
  });
});
