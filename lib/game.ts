/**
 * Game service: everything the API routes do. Server only.
 *
 * All scoring happens here with lib/scoring.ts. Nothing returned before an
 * answer contains answer_value, trap_value, accepted_answers or trap_answers
 * (§7.7), and nothing comparative is returned until the play is finished.
 */
import { getStore, type Store } from './db';
import {
  closeness as closenessOf, isTrapped, points as pointsOf, timeBonus as timeBonusOf, level, percentile as percentileOf, rq as rqOf,
  altitudeGain, wordCloseness, LEVELS, COLD_START_MIN_PLAYS, TIME_GRACE_S,
} from './scoring';
import { parseNumber, formatNumber } from './parseNumber';
import { judgeWord, EmptyAnswerError, MAX_WORD_INPUT } from './wordJudge';
import { defaultEmbedder } from './embed';
import { defaultJudge } from './judge';
import { addDays, daysBetween, launchDate, nextResetAt, puzzleNumber, todayPuzzleDate } from './dates';
import { seedStore } from './contentLoader';
import { shareText } from './share';
import { normalizeWord } from './normalize';
import { BASELINE_DAYS, BASELINE_MAX_SCORES, blendedPercentile, scoreCurve, topPercent } from './earlyEstimate';
import { FUEL_GRACE_MS } from './timing';
import type {
  Answer, AnswerResult, CrowdHistogram, DailySet, DebriefEntry, Play, ResultsPayload, Riddle, ServedRiddle, StatsPayload, Tier, TodayState,
} from './types';
import { TIERS } from './types';

export class GameError extends Error {
  constructor(public status: number, message: string, public extra: Record<string, unknown> = {}) {
    super(message);
  }
}

type Slot = 1 | 2 | 3;
const SLOT_TIER: Record<Slot, Tier> = { 1: 'warmup', 2: 'trap', 3: 'boss' };
export const MAX_SCORE = 450;

export function isSlot(v: unknown): v is Slot {
  return v === 1 || v === 2 || v === 3;
}

/* ---------------- Setup ---------------- */

const seeding = new WeakMap<Store, Promise<unknown>>();

/** The local dev store seeds itself from content/ on first use. Supabase is seeded with `npm run seed`. */
async function ensureContent(store: Store) {
  if (store.kind !== 'local') return;
  if ((await store.countRiddles()) > 0) return;
  if (!seeding.has(store)) seeding.set(store, seedStore(store, defaultEmbedder().embed));
  await seeding.get(store);
}

function fallbackAllowed() {
  return process.env.NODE_ENV !== 'production' || process.env.BURNER_FALLBACK_SCHEDULE === '1';
}

/** Today's set. Outside production, days without a schedule entry reuse scheduled sets in rotation. */
async function resolveSet(store: Store, date: string): Promise<DailySet> {
  const set = await store.getDailySet(date);
  if (set) return set;
  if (fallbackAllowed()) {
    const all = (await store.listDailySets()).filter((s) => s.puzzle_date !== date);
    if (all.length) {
      const base = all[((daysBetween(all[0].puzzle_date, date) % all.length) + all.length) % all.length];
      const made: DailySet = { ...base, puzzle_date: date, puzzle_number: puzzleNumber(date, launchDate()) };
      await store.upsertDailySets([made]);
      return made;
    }
  }
  throw new GameError(503, "Today's riddles aren't ready yet. Check back soon.");
}

async function ctx(now = new Date()) {
  const store = await getStore();
  await ensureContent(store);
  const date = todayPuzzleDate(now);
  const set = await resolveSet(store, date);
  return { store, date, set, now };
}

function riddleIdFor(set: DailySet, slot: Slot) {
  return slot === 1 ? set.warmup_id : slot === 2 ? set.trap_id : set.boss_id;
}

async function loadRiddle(store: Store, id: string): Promise<Riddle> {
  const r = await store.getRiddle(id);
  if (!r) throw new GameError(500, `Riddle ${id} is missing`);
  return r;
}

function altitudeOf(answers: Answer[]) {
  return answers.reduce((a, x) => a + (x.answered_at ? altitudeGain(x.points ?? 0) : 0), 0);
}

/* ---------------- Streaks ---------------- */

function streaks(finishedDates: string[], today: string) {
  const dates = [...new Set(finishedDates)].sort();
  let max = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of dates) {
    run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
    max = Math.max(max, run);
    prev = d;
  }
  const set = new Set(dates);
  let cur = 0;
  let d = set.has(today) ? today : addDays(today, -1);
  while (set.has(d)) {
    cur++;
    d = addDays(d, -1);
  }
  return { current: cur, max };
}

export async function currentStreak(deviceId: string | null): Promise<number> {
  if (!deviceId) return 0;
  try {
    const store = await getStore();
    const plays = await store.listPlays(deviceId);
    return streaks(plays.filter((p) => p.finished_at).map((p) => p.puzzle_date), todayPuzzleDate()).current;
  } catch {
    return 0;
  }
}

/* ---------------- Today ---------------- */

export async function getToday(deviceId: string): Promise<TodayState> {
  const { store, date, set, now } = await ctx();
  const play = await store.getPlay(deviceId, date);
  const answers = play ? await store.getAnswers(play.id) : [];
  const answered = answers.filter((a) => a.answered_at);
  const status = !play ? 'not_started' : play.finished_at ? 'finished' : 'in_progress';
  const next = ([1, 2, 3] as Slot[]).find((s) => !answered.some((a) => a.slot === s)) ?? null;
  const plays = await store.listPlays(deviceId);
  return {
    puzzleNumber: set.puzzle_number,
    puzzleDate: date,
    nextResetAt: nextResetAt(now).toISOString(),
    status,
    currentSlot: status === 'finished' ? null : (next ?? 1),
    progress: answered.map((a) => ({ slot: a.slot, closeness: a.closeness ?? 0, altitudeGain: altitudeGain(a.points ?? 0) })),
    altitude: altitudeOf(answers),
    streak: streaks(plays.filter((p) => p.finished_at).map((p) => p.puzzle_date), date).current,
    deviceId,
  };
}

export async function startPlay(deviceId: string) {
  const { store, date } = await ctx();
  const play = await store.createPlay(deviceId, date);
  return { playId: play.id };
}

async function requirePlay(store: Store, deviceId: string, date: string): Promise<Play> {
  const play = await store.getPlay(deviceId, date);
  if (!play) throw new GameError(409, 'Start the climb first');
  return play;
}

/* ---------------- Serve ---------------- */

export async function serveRiddle(deviceId: string, slot: Slot): Promise<ServedRiddle> {
  const { store, date, set, now } = await ctx();
  const play = await requirePlay(store, deviceId, date);
  const answers = await store.getAnswers(play.id);
  if (slot > 1 && !answers.find((a) => a.slot === slot - 1 && a.answered_at)) {
    throw new GameError(409, `Answer riddle ${slot - 1} first`);
  }
  const riddle = await loadRiddle(store, riddleIdFor(set, slot));
  // Idempotent: an already-served riddle keeps its original served_at, so a refresh never resets the timer.
  // The clock starts FUEL_GRACE_MS after the first serve, covering the pan-up and the ignite countdown.
  const row = await store.serveAnswer({
    play_id: play.id, riddle_id: riddle.id, slot, served_at: new Date(now.getTime() + FUEL_GRACE_MS).toISOString(), hint_used: false, raw_input: null, parsed_value: null,
    normalized_input: null, closeness: null, ladder_level: null, verdict: null, trapped: false, judge_source: null, answered_at: null, points: null,
  });
  return {
    slot,
    tier: riddle.tier,
    promptMd: riddle.prompt_md,
    answerType: riddle.answer_type,
    numberFormat: riddle.answer_type === 'number' ? (riddle.number_format ?? null) : null,
    unitLabel: riddle.answer_type === 'number' ? (riddle.unit_label ?? null) : null,
    timeLimitS: riddle.time_limit_s,
    servedAt: row.served_at,
    serverNow: new Date().toISOString(),
  };
}

/* ---------------- Answer ---------------- */

function displayAnswer(riddle: Riddle, a: Answer): string {
  if (a.verdict === 'timeout' || (a.raw_input === null && a.answered_at)) return 'No answer';
  if (riddle.answer_type === 'word') return (a.raw_input ?? '').trim().slice(0, MAX_WORD_INPUT);
  if (a.parsed_value === null) return a.raw_input ?? '';
  return riddle.number_format === 'percent' ? `${formatNumber(a.parsed_value)}%` : `${formatNumber(a.parsed_value)} ${riddle.unit_label ?? ''}`.trim();
}

function secondsTaken(a: Answer) {
  return Math.max(0, (Date.parse(a.answered_at!) - Date.parse(a.served_at)) / 1000);
}

function toResult(riddle: Riddle, a: Answer, all: Answer[], finished: boolean): AnswerResult {
  const c = a.closeness ?? 0;
  const tb = a.verdict === 'timeout' ? 0 : timeBonusOf(c, Math.min(secondsTaken(a), riddle.time_limit_s), riddle.time_limit_s);
  const norm = a.normalized_input;
  const canonical = normalizeWord(riddle.answer_display);
  const r: AnswerResult = {
    slot: a.slot,
    points: a.points ?? 0,
    closeness: c,
    trapped: a.trapped,
    answerDisplay: riddle.answer_display,
    altitudeGain: altitudeGain(a.points ?? 0),
    altitudeTotal: altitudeOf(all),
    timedOut: a.verdict === 'timeout',
    timeBonus: tb,
    yourAnswer: displayAnswer(riddle, a),
    finished,
  };
  if (riddle.answer_type === 'number') {
    r.parsedValue = a.parsed_value;
    r.ladderLevel = a.ladder_level;
  } else {
    r.verdict = a.verdict;
    r.acceptedAs = a.verdict === 'correct' && norm && norm !== canonical ? riddle.answer_display : null;
  }
  return r;
}

export async function submitAnswer(deviceId: string, slot: Slot, input: string | null): Promise<AnswerResult> {
  const { store, date, set } = await ctx();
  const play = await requirePlay(store, deviceId, date);
  let answers = await store.getAnswers(play.id);
  const row = answers.find((a) => a.slot === slot);
  if (!row) throw new GameError(409, 'That riddle has not been served yet');
  const riddle = await loadRiddle(store, riddleIdFor(set, slot));

  if (!row.answered_at) {
    const now = new Date();
    if (now.getTime() < Date.parse(row.served_at)) throw new GameError(409, "The fuel isn't lit yet");
    const elapsed = (now.getTime() - Date.parse(row.served_at)) / 1000;
    const timedOut = input === null || elapsed > riddle.time_limit_s + TIME_GRACE_S;
    const t = Math.min(elapsed, riddle.time_limit_s);
    let patch: Partial<Answer>;

    if (timedOut) {
      patch = { raw_input: null, closeness: 0, points: 0, verdict: 'timeout', trapped: false, ladder_level: riddle.answer_type === 'number' ? level(0) : null };
    } else if (riddle.answer_type === 'number') {
      const fmt = riddle.number_format!;
      const parsed = parseNumber(String(input), fmt, riddle.unit_label);
      // Unparseable input: 400 with a reason; the timer keeps running (§7.7).
      if (!parsed.ok) throw new GameError(400, parsed.reason, { reason: parsed.reason });
      const c = closenessOf(fmt, parsed.value, riddle.answer_value!, riddle.closeness_cap!);
      patch = {
        raw_input: String(input).slice(0, 80),
        parsed_value: parsed.value,
        closeness: c,
        ladder_level: level(c),
        trapped: isTrapped(fmt, parsed.value, riddle.answer_value!, riddle.trap_value!, riddle.closeness_cap!),
        points: pointsOf(c, t, riddle.time_limit_s, row.hint_used),
        verdict: null,
      };
    } else {
      let j;
      try {
        j = await judgeWord(riddle, String(input), {
          getCached: (r, n) => store.getWordVerdict(r, n),
          putCached: (v) => store.putWordVerdict(v),
          getAnswerEmbeddings: (r) => store.getAnswerEmbeddings(r),
          embed: defaultEmbedder().embed,
          judge: defaultJudge,
        });
      } catch (e) {
        if (e instanceof EmptyAnswerError) throw new GameError(400, e.message, { reason: e.message });
        throw e;
      }
      const c = wordCloseness(j.verdict);
      patch = {
        raw_input: String(input).slice(0, MAX_WORD_INPUT),
        normalized_input: j.normalized,
        closeness: c,
        verdict: j.verdict,
        trapped: j.verdict === 'trapped',
        judge_source: j.source,
        points: pointsOf(c, t, riddle.time_limit_s, row.hint_used),
      };
    }
    // Answered time is the server's clock (§4.4), not the client's.
    await store.completeAnswer(play.id, slot, { ...patch, answered_at: now.toISOString() });
    answers = await store.getAnswers(play.id);
  }

  let finished = Boolean(play.finished_at);
  if (slot === 3 && answers.filter((a) => a.answered_at).length === 3 && !play.finished_at) {
    await finishPlay(store, play, answers, date);
    finished = true;
  }
  const stored = answers.find((a) => a.slot === slot)!;
  return toResult(riddle, stored, answers, finished);
}

async function finishPlay(store: Store, play: Play, answers: Answer[], date: string) {
  const total = answers.reduce((a, x) => a + (x.points ?? 0), 0);
  const others = await store.finishedScores(date);
  const scores = [...others, total];
  const n = scores.length;
  const pct = n >= COLD_START_MIN_PLAYS ? percentileOf(total, scores) : null;
  await store.updatePlay(play.id, {
    finished_at: new Date().toISOString(),
    total_score: total,
    final_percentile: pct === null ? null : Math.round(pct),
    final_rq: pct === null ? null : rqOf(pct),
  });
}

/* ---------------- Results (only after finishing) ---------------- */

function crowdHistogram(riddle: Riddle, values: number[], you: number | null): CrowdHistogram {
  const B = 25;
  const ans = riddle.answer_value!;
  const trap = riddle.trap_value!;
  let bucket: (v: number) => number;
  let axis: CrowdHistogram['axis'];
  let scale: CrowdHistogram['scale'];
  if (riddle.number_format === 'percent') {
    bucket = (v) => Math.min(B - 1, Math.max(0, Math.floor((v / 100) * B)));
    axis = { min: '0%', mid: '50%', max: '100%' };
    scale = 'linear';
  } else {
    const pad = Math.max(0.5, (riddle.closeness_cap ?? 2) / 2);
    const lo = Math.log10(Math.min(ans, trap)) - pad;
    const hi = Math.log10(Math.max(ans, trap)) + pad;
    bucket = (v) => (v <= 0 ? 0 : Math.min(B - 1, Math.max(0, Math.floor(((Math.log10(v) - lo) / (hi - lo)) * B))));
    const unit = riddle.unit_label ? ` ${riddle.unit_label}` : '';
    const sig = (v: number) => Number(v.toPrecision(2)).toLocaleString('en-US', { maximumFractionDigits: 6 });
    axis = { min: sig(10 ** lo), mid: sig(10 ** ((lo + hi) / 2)), max: sig(10 ** hi) + unit };
    scale = 'log';
  }
  const counts = new Array<number>(B).fill(0);
  for (const v of values) counts[bucket(v)]++;
  return { counts, answerBucket: bucket(ans), trapBucket: bucket(trap), youBucket: you === null ? null : bucket(you), axis, scale };
}

export async function getResults(deviceId: string): Promise<ResultsPayload> {
  const { store, date, set, now } = await ctx();
  const play = await requirePlay(store, deviceId, date);
  if (!play.finished_at) throw new GameError(403, 'Finish the climb to see results');
  const answers = await store.getAnswers(play.id);
  const scores = await store.finishedScores(date);
  const n = scores.length;
  const coldStart = n < COLD_START_MIN_PLAYS;
  const total = play.total_score ?? 0;
  // Live: re-computed every time Results opens (§4.7). Under 30 players it is an early
  // estimate blended with recent days (lib/earlyEstimate.ts) and is never stored.
  const past = coldStart ? await store.recentFinishedScores(addDays(date, -BASELINE_DAYS), date, BASELINE_MAX_SCORES) : [];
  const { percentile: pct, estimated } = blendedPercentile(total, scores, past);

  const perRiddle: ResultsPayload['perRiddle'] = [];
  const debrief: DebriefEntry[] = [];
  for (const slot of [1, 2, 3] as Slot[]) {
    const a = answers.find((x) => x.slot === slot)!;
    const riddle = await loadRiddle(store, a.riddle_id);
    const res = toResult(riddle, a, answers, true);
    perRiddle.push({
      slot, tier: SLOT_TIER[slot], answerType: riddle.answer_type, ladderLevel: a.ladder_level, verdict: a.verdict, trapped: a.trapped,
      timeBonus: res.timeBonus, points: a.points ?? 0, closeness: a.closeness ?? 0,
    });

    let trapRate: number | null = null;
    let crowd: CrowdHistogram | null = null;
    let topAnswers: DebriefEntry['topAnswers'] = null;
    if (!coldStart) {
      const rows = await store.crowdAnswers(riddle.id, date);
      trapRate = rows.length ? rows.filter((r) => r.trapped).length / rows.length : 0;
      if (riddle.answer_type === 'number') {
        crowd = crowdHistogram(riddle, rows.map((r) => r.parsed_value).filter((v): v is number => v !== null), a.parsed_value);
      } else {
        const groups = new Map<string, { count: number; verdict: string | null }>();
        let withInput = 0;
        for (const r of rows) {
          if (!r.normalized_input) continue;
          withInput++;
          const g = groups.get(r.normalized_input) ?? { count: 0, verdict: r.verdict };
          g.count++;
          groups.set(r.normalized_input, g);
        }
        topAnswers = [...groups.entries()]
          .sort((x, y) => y[1].count - x[1].count || x[0].localeCompare(y[0]))
          .slice(0, 5)
          .map(([text, g]) => ({
            text, share: withInput ? g.count / withInput : 0, isCorrect: g.verdict === 'correct', isTrap: g.verdict === 'trapped', isYou: text === a.normalized_input,
          }));
      }
    }
    const canReport = riddle.answer_type === 'word' && a.verdict !== 'correct' && a.verdict !== 'timeout' && Boolean(a.normalized_input);
    debrief.push({
      slot, tier: SLOT_TIER[slot], answerType: riddle.answer_type, numberFormat: riddle.number_format ?? null,
      promptShort: riddle.prompt_short || riddle.prompt_md, yourAnswer: res.yourAnswer, closeness: a.closeness ?? 0, points: a.points ?? 0,
      trapped: a.trapped, verdict: a.verdict, ladderLevel: a.ladder_level, timeBonus: res.timeBonus,
      answerDisplay: riddle.answer_display, explainIntuitionMd: riddle.explain_intuition_md, explainMathMd: riddle.explain_math_md,
      trapRate, crowd, topAnswers, canReport, reported: canReport ? await store.hasReport(riddle.id, deviceId) : false,
    });
  }

  return {
    puzzleNumber: set.puzzle_number,
    puzzleDate: date,
    nextResetAt: nextResetAt(now).toISOString(),
    totalScore: total,
    maxScore: MAX_SCORE,
    altitude: altitudeOf(answers),
    percentile: pct,
    estimated,
    n,
    coldStart,
    curve: scoreCurve(scores, past),
    perRiddle,
    shareText: shareText({ puzzleNumber: set.puzzle_number, top: topPercent(pct), estimated, rows: perRiddle, domain: process.env.NEXT_PUBLIC_SITE_DOMAIN || 'riddlerr.com' }),
    debrief,
  };
}

/* ---------------- Reports and stats ---------------- */

export async function reportVerdict(deviceId: string, slot: Slot) {
  const { store, date } = await ctx();
  const play = await requirePlay(store, deviceId, date);
  if (!play.finished_at) throw new GameError(403, 'Finish the climb first');
  const a = (await store.getAnswers(play.id)).find((x) => x.slot === slot);
  if (!a?.normalized_input) throw new GameError(400, 'Only word answers can be reported');
  if (!(await store.hasReport(a.riddle_id, deviceId))) {
    await store.insertReport({ riddle_id: a.riddle_id, normalized_input: a.normalized_input, device_id: deviceId });
  }
  return { ok: true };
}

export async function getStats(deviceId: string): Promise<StatsPayload> {
  const store = await getStore();
  const today = todayPuzzleDate();
  const plays = (await store.listPlays(deviceId)).filter((p) => p.finished_at);
  const answers = await store.deviceAnswers(deviceId);
  const finishedIds = new Set(plays.map((p) => p.id));
  const trapTier = answers.filter((a) => a.slot === 2 && a.answered_at && a.verdict !== 'timeout' && finishedIds.has(a.play_id));
  const pcts = plays.map((p) => p.final_percentile).filter((v): v is number => v !== null);
  const best = answers.reduce((b, a) => {
    const i = a.ladder_level ? LEVELS.indexOf(a.ladder_level as (typeof LEVELS)[number]) : -1;
    return Math.max(b, i);
  }, -1);
  const { current, max } = streaks(plays.map((p) => p.puzzle_date), today);
  return {
    gamesPlayed: plays.length,
    currentStreak: current,
    maxStreak: max,
    trapResistance: trapTier.length ? 1 - trapTier.filter((a) => a.trapped).length / trapTier.length : null,
    averagePercentile: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null,
    bestLevel: best >= 0 ? LEVELS[best] : null,
    lastPercentiles: plays.slice(-14).map((p) => ({ puzzleDate: p.puzzle_date, percentile: p.final_percentile })),
  };
}

export { TIERS };
