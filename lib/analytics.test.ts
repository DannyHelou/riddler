import { describe, expect, it } from 'vitest';
import { attention, dailyCounts, formatMs, funnel, hourHistogram, playStatus, rangeDates, retention, riddleStats, streakAt, timeline } from './analytics';
import type { Play } from './types';
import type { AnswerWithPlay, EventRow } from './db';

const play = (id: string, device: string, date: string, finished = true, started = `${date}T15:00:00Z`): Play => ({
  id, device_id: device, puzzle_date: date, started_at: started, finished_at: finished ? started : null, total_score: finished ? 200 : null, final_percentile: null, final_rq: null,
});
const answer = (p: Play, slot: 1 | 2 | 3, o: Partial<AnswerWithPlay> = {}): AnswerWithPlay => ({
  play_id: p.id, riddle_id: `r${slot}`, slot, served_at: '2026-11-10T15:00:00.000Z', hint_used: false, raw_input: '5', parsed_value: 5, normalized_input: null,
  closeness: 0.5, ladder_level: null, verdict: null, trapped: false, judge_source: null, answered_at: '2026-11-10T15:00:10.000Z', points: 50,
  puzzle_date: p.puzzle_date, device_id: p.device_id, ...o,
});
let nextId = 1;
const ev = (name: string, o: Partial<EventRow> = {}): EventRow => ({
  id: nextId++, ts: '2026-11-10T15:00:00.000Z', client_ts: null, device_id: 'd1', session_id: 's1', play_id: null, name, props: {}, path: '/', country: null, device_kind: 'phone', ...o,
});

describe('analytics aggregations', () => {
  const a = play('a', 'd1', '2026-11-10');
  const b = play('b', 'd2', '2026-11-10', false);
  const c = play('c', 'd1', '2026-11-09');

  it('counts players and finishes per day, including empty days', () => {
    expect(dailyCounts([a, b, c], '2026-11-08', '2026-11-10')).toEqual([
      { date: '2026-11-08', players: 0, finished: 0 },
      { date: '2026-11-09', players: 1, finished: 1 },
      { date: '2026-11-10', players: 2, finished: 1 },
    ]);
  });

  it('buckets start times by Toronto hour', () => {
    const h = hourHistogram([a]); // 15:00Z = 10:00 EST
    expect(h[10]).toBe(1);
    expect(h.reduce((s, x) => s + x, 0)).toBe(1);
  });

  it('builds a funnel that never widens', () => {
    const visits = [ev('visit_home', { device_id: 'd1' }), ev('visit_home', { device_id: 'd1' }), ev('visit_home', { device_id: null, session_id: 'x' })];
    const steps = funnel(visits, [a, b], [answer(a, 1), answer(a, 2), answer(a, 3), answer(b, 1), answer(b, 2, { answered_at: null })]);
    // d2 started without a homepage visit, so it's added to Visited.
    expect(steps.map((s) => s.count)).toEqual([3, 2, 2, 1, 1, 1]);
  });

  it('summarizes each riddle', () => {
    const rows = [
      answer(a, 1, { closeness: 1, verdict: 'correct' }),
      answer(b, 1, { closeness: 0, verdict: 'timeout', raw_input: null }),
      answer(c, 1, { answered_at: null, closeness: null }),
      answer(a, 2, { trapped: true }),
    ];
    const [s1, s2] = riddleStats(rows);
    expect(s1).toMatchObject({ slot: 1, served: 3, answered: 2, abandoned: 1, avgCloseness: 0.5, correctRate: 0.5, timeoutRate: 0.5, medianTimeMs: 10_000 });
    expect(s2).toMatchObject({ slot: 2, trapRate: 1 });
  });

  it('computes streaks and returning players', () => {
    expect(streakAt(new Set(['2026-11-08', '2026-11-09', '2026-11-10']), '2026-11-10')).toBe(3);
    expect(streakAt(new Set(['2026-11-08', '2026-11-10']), '2026-11-10')).toBe(1);
    const r = retention([a, b, c], '2026-11-10', '2026-11-10');
    expect(r.players).toBe(2);
    expect(r.returning).toBe(1);
    expect(r.streaks.find((s) => s.label === '2 days')!.count).toBe(1);
    expect(r.streaks.find((s) => s.label === '1 day')!.count).toBe(1);
  });

  it('measures time away from the tab', () => {
    const s = attention([ev('tab_hidden', { play_id: 'a' }), ev('tab_returned', { props: { hiddenMs: 1200 } }), ev('tab_hidden', { play_id: 'a' }), ev('page_left')]);
    expect(s).toEqual({ hiddenPlays: 1, hiddenEvents: 2, hiddenMs: 1200, pageLeft: 1 });
  });

  it('merges a device timeline in time order with gaps', () => {
    const t = timeline(a, [answer(a, 1)], [ev('tab_hidden', { ts: '2026-11-10T15:00:05.000Z', props: { slot: 1 } })]);
    expect(t.map((x) => x.label)).toEqual(['riddle 1 served', 'play created', 'play finished', 'tab hidden', 'riddle 1 answered']);
    expect(t[3].gapMs).toBe(5000);
    expect(t[4].detail).toContain('10s');
  });

  it('marks unfinished plays from past days as abandoned', () => {
    expect(playStatus(b, '2026-11-10')).toBe('in progress');
    expect(playStatus(b, '2026-11-11')).toBe('abandoned');
    expect(playStatus(a, '2026-11-11')).toBe('finished');
  });

  it('resolves ranges, clamped to launch', () => {
    expect(rangeDates('7d', '2026-11-12', '2026-10-04')).toEqual({ from: '2026-11-06', to: '2026-11-12' });
    expect(rangeDates('28d', '2026-10-06', '2026-10-04')).toEqual({ from: '2026-10-04', to: '2026-10-06' });
    expect(rangeDates('yesterday', '2026-11-12', '2026-10-04')).toEqual({ from: '2026-11-11', to: '2026-11-11' });
  });

  it('formats durations', () => {
    expect(formatMs(850)).toBe('850ms');
    expect(formatMs(12_300)).toBe('12s');
    expect(formatMs(3_400)).toBe('3.4s');
    expect(formatMs(125_000)).toBe('2m 5s');
  });
});
