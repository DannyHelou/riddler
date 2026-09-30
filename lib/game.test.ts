import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { setStore } from './db';
import { LocalStore } from './store/local';
import * as game from './game';
import { FUEL_GRACE_MS } from './timing';

const SECRET_KEYS = ['answer_value', 'trap_value', 'accepted_answers', 'trap_answers', 'answerValue', 'trapValue', 'answerDisplay'];

function leaks(obj: unknown): string[] {
  const s = JSON.stringify(obj);
  return SECRET_KEYS.filter((k) => s.includes(k)).concat(/piano|keychain|9\.02|about 9%|6 flips/i.test(s) ? ['answer text'] : []);
}

/** Serve, then move the clock to the moment the fuel lights (§5.3 fuel grace). */
async function serve(device: string, slot: 1 | 2 | 3) {
  const r = await game.serveRiddle(device, slot);
  vi.setSystemTime(Date.parse(r.servedAt));
  return r;
}

async function playDay(device: string, inputs: [string | null, string | null, string | null]) {
  await game.startPlay(device);
  for (const slot of [1, 2, 3] as const) {
    await serve(device, slot);
    await game.submitAnswer(device, slot, inputs[slot - 1]);
  }
}

describe('game service (§7.7, §10)', () => {
  beforeEach(() => {
    vi.stubEnv('PUZZLE_DATE_OVERRIDE', '2026-10-01'); // keys-no-locks, bayes-disease-test, coin-two-heads
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    vi.stubEnv('VOYAGE_API_KEY', '');
    setStore(new LocalStore(':memory:'));
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('never sends answers before the player answers (§10.2)', async () => {
    const d = randomUUID();
    expect(leaks(await game.getToday(d))).toEqual([]);
    await game.startPlay(d);
    for (const slot of [1, 2, 3] as const) {
      const served = await serve(d, slot);
      expect(leaks(served)).toEqual([]);
      await game.submitAnswer(d, slot, slot === 1 ? 'piano' : '9');
    }
  });

  it('refuses serving out of order and results before finishing', async () => {
    const d = randomUUID();
    await game.startPlay(d);
    await expect(game.serveRiddle(d, 2)).rejects.toMatchObject({ status: 409 });
    await expect(game.getResults(d)).rejects.toMatchObject({ status: 403 });
  });

  it('keeps the original served_at on a refresh (§10.3)', async () => {
    const d = randomUUID();
    await game.startPlay(d);
    const a = await game.serveRiddle(d, 1);
    vi.setSystemTime(Date.now() + 20);
    const b = await game.serveRiddle(d, 1);
    expect(b.servedAt).toBe(a.servedAt);
  });

  it('lights the fuel a fixed grace after the first serve, and not before (§5.3)', async () => {
    const d = randomUUID();
    await game.startPlay(d);
    const t0 = Date.now();
    const s = await game.serveRiddle(d, 1);
    expect(Date.parse(s.servedAt) - t0).toBe(FUEL_GRACE_MS);
    await expect(game.submitAnswer(d, 1, 'piano')).rejects.toMatchObject({ status: 409 });
    // A refresh during the grace keeps the same countdown.
    vi.setSystemTime(t0 + 500);
    expect((await game.serveRiddle(d, 1)).servedAt).toBe(s.servedAt);
    // Time is counted from the moment the fuel lights: 4 s after it, not 4 s + grace.
    vi.setSystemTime(Date.parse(s.servedAt) + 4000);
    const r = await game.submitAnswer(d, 1, 'piano');
    expect(r.verdict).toBe('correct');
    const stored = await game.submitAnswer(d, 1, 'piano');
    expect(stored.timeBonus).toBe(r.timeBonus);
    expect(r.timeBonus).toBeGreaterThan(0);
  });

  it('allows one play per device per date and answers idempotently (§10.4)', async () => {
    const d = randomUUID();
    const p1 = await game.startPlay(d);
    const p2 = await game.startPlay(d);
    expect(p2.playId).toBe(p1.playId);
    await serve(d, 1);
    const first = await game.submitAnswer(d, 1, 'piano');
    const again = await game.submitAnswer(d, 1, 'keychain');
    expect(again).toEqual(first);
    expect(first.verdict).toBe('correct');
  });

  it('rejects unparseable numbers with 400 and keeps the riddle open', async () => {
    const d = randomUUID();
    await game.startPlay(d);
    await serve(d, 1);
    await game.submitAnswer(d, 1, 'piano');
    await serve(d, 2);
    await expect(game.submitAnswer(d, 2, 'lots')).rejects.toMatchObject({ status: 400 });
    const ok = await game.submitAnswer(d, 2, '1 in 11');
    expect(ok.ladderLevel).toBe('Oracle');
  });

  it('scores traps and timeouts, and accumulates altitude (§10.16)', async () => {
    const d = randomUUID();
    await game.startPlay(d);
    await serve(d, 1);
    const r1 = await game.submitAnswer(d, 1, 'key ring');
    expect(r1).toMatchObject({ verdict: 'trapped', trapped: true, points: 0 });
    await serve(d, 2);
    const r2 = await game.submitAnswer(d, 2, '99');
    expect(r2).toMatchObject({ trapped: true, ladderLevel: 'Goldfish', points: 0 });
    await serve(d, 3);
    const r3 = await game.submitAnswer(d, 3, '6');
    expect(r3.ladderLevel).toBe('Oracle');
    expect(r3.altitudeTotal).toBe(r3.points * 250);
    expect(r3.finished).toBe(true);
    const today = await game.getToday(d);
    expect(today).toMatchObject({ status: 'finished', altitude: r3.points * 250 });
  });

  it('treats a null answer as a timeout scoring 0', async () => {
    const d = randomUUID();
    await game.startPlay(d);
    await serve(d, 1);
    const r = await game.submitAnswer(d, 1, null);
    expect(r).toMatchObject({ timedOut: true, points: 0, closeness: 0, verdict: 'timeout' });
  });

  it('shows the cold-start message under 30 players, then percentile and RQ (§4.7)', async () => {
    const me = randomUUID();
    await playDay(me, ['piano', '9', '6']);
    const cold = await game.getResults(me);
    expect(cold).toMatchObject({ coldStart: true, percentile: null, rq: null, n: 1, histogram: null });
    expect(cold.debrief.every((x) => x.crowd === null && x.trapRate === null && x.topAnswers === null)).toBe(true);
    expect(cold.shareText).toMatch(/Early bird\./);

    for (let i = 0; i < 30; i++) await playDay(randomUUID(), [i % 2 ? 'piano' : 'keychain', i % 3 ? '99' : '10', String(3 + (i % 6))]);
    const warm = await game.getResults(me);
    expect(warm.coldStart).toBe(false);
    expect(warm.n).toBe(31);
    expect(warm.percentile).toBeGreaterThan(50);
    expect(warm.rq).toBeGreaterThan(100);
    const trap = warm.debrief[1];
    expect(trap.crowd?.counts.reduce((a, b) => a + b, 0)).toBe(31);
    expect(trap.trapRate).toBeGreaterThan(0.5);
    const words = warm.debrief[0].topAnswers!;
    expect(words.find((w) => w.text === 'piano')).toMatchObject({ isCorrect: true, isYou: true });
    expect(words.find((w) => w.text === 'keychain')).toMatchObject({ isTrap: true });
    expect(warm.shareText).not.toMatch(/piano|9%/);
  });

  it('computes personal stats and streaks', async () => {
    const d = randomUUID();
    await playDay(d, ['piano', '99', '6']);
    vi.stubEnv('PUZZLE_DATE_OVERRIDE', '2026-10-02');
    await playDay(d, ['5', '50', '16']);
    const s = await game.getStats(d);
    expect(s).toMatchObject({ gamesPlayed: 2, currentStreak: 2, maxStreak: 2, bestLevel: 'Oracle' });
    expect(s.trapResistance).toBe(0.5);
  });
});
