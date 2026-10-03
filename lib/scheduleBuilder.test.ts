import { describe, expect, it } from 'vitest';
import { buildSchedule } from './scheduleBuilder';
import { REPEAT_GAP_DAYS, validateSchedule } from './content';
import type { Riddle, Tier } from './types';

function pool(tier: Tier, n: number, type: 'number' | 'word' = 'number'): Riddle[] {
  return Array.from({ length: n }, (_, i) => ({ id: `${tier}-${i}`, tier, answer_type: type }) as Riddle);
}
const byId = (rs: Riddle[]) => new Map(rs.map((r) => [r.id, r]));

describe('buildSchedule', () => {
  const riddles = [...pool('warmup', 90), ...pool('trap', 91), ...pool('boss', 92)];

  it('covers a year with valid gaps and a new trio every day', () => {
    const { schedule, minGap, repeatedTrios, pools } = buildSchedule(riddles, { start: '2026-10-01', days: 365 });
    expect(Object.keys(schedule)).toHaveLength(365);
    expect(pools).toEqual({ warmup: 90, trap: 91, boss: 92 });
    expect(minGap).toBe(90);
    expect(repeatedTrios).toBe(0);
    expect(validateSchedule(schedule, byId(riddles))).toEqual([]);
  });

  it('rotates: a riddle returns once per pool length', () => {
    const { schedule } = buildSchedule(riddles, { start: '2026-10-01', days: 200 });
    expect(schedule['2026-10-01'].trap).toBe(schedule['2026-12-31'].trap); // 91 days later
    expect(schedule['2026-10-01'].boss).toBe(schedule['2027-01-01'].boss); // 92 days later
  });

  it('keeps days before keepBefore and the existing order at the front', () => {
    const first = buildSchedule(riddles, { start: '2026-10-01', days: 30 }).schedule;
    const custom = { ...first, '2026-10-02': { warmup: 'warmup-50', trap: 'trap-50', boss: 'boss-50' } };
    const { schedule } = buildSchedule(riddles, { start: '2026-10-01', days: 365, existing: custom, keepBefore: '2026-10-03' });
    expect(schedule['2026-10-02']).toEqual(custom['2026-10-02']);
    expect(validateSchedule(schedule, byId(riddles))).toEqual([]);
  });

  it('never puts a word riddle in the trap slot', () => {
    const rs = [...pool('warmup', 95), ...pool('trap', 95), ...pool('boss', 95), { id: 'word-trap', tier: 'trap', answer_type: 'word' } as Riddle];
    const { schedule } = buildSchedule(rs, { start: '2026-10-01', days: 365 });
    expect(Object.values(schedule).some((d) => d.trap === 'word-trap')).toBe(false);
  });

  it('fails clearly when a pool is smaller than the repeat gap', () => {
    const small = [...pool('warmup', 90), ...pool('trap', REPEAT_GAP_DAYS - 1), ...pool('boss', 92)];
    expect(() => buildSchedule(small, { start: '2026-10-01', days: 365 })).toThrow(/Not enough trap riddles/);
  });
});
