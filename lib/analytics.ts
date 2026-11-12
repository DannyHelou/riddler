/**
 * Pure aggregations behind the owner dashboard (/admin). Inputs are plain rows from the
 * store (plays, answers, events); no I/O here, so it's all unit-tested (lib/analytics.test.ts).
 */
import type { Answer, Play } from './types';
import type { AnswerWithPlay, EventRow } from './db';
import { PUZZLE_TZ, addDays, daysBetween } from './dates';

export interface DayCount {
  date: string;
  /** Distinct devices that started a play. */
  players: number;
  finished: number;
}

export function dailyCounts(plays: Play[], fromDate: string, toDate: string): DayCount[] {
  const out: DayCount[] = [];
  for (let d = fromDate; d <= toDate; d = addDays(d, 1)) {
    const day = plays.filter((p) => p.puzzle_date === d);
    out.push({ date: d, players: new Set(day.map((p) => p.device_id)).size, finished: day.filter((p) => p.finished_at).length });
  }
  return out;
}

/** Hour of day (0–23) of an instant in the puzzle time zone. */
export function hourInZone(iso: string, tz = PUZZLE_TZ): number {
  const h = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(new Date(iso));
  return Number(h) % 24;
}

/** Plays started per hour of day, Toronto time. */
export function hourHistogram(plays: Play[], tz = PUZZLE_TZ): number[] {
  const out = Array<number>(24).fill(0);
  for (const p of plays) out[hourInZone(p.started_at, tz)]++;
  return out;
}

export interface FunnelStep {
  label: string;
  count: number;
}

/**
 * visited → started → answered riddle 1 → 2 → 3 → finished. "Visited" counts distinct devices
 * (or tabs, without a cookie) that opened the homepage, plus anyone who started without it
 * (a shared link straight to /play), so the funnel never widens.
 */
export function funnel(visits: EventRow[], plays: Play[], answers: AnswerWithPlay[]): FunnelStep[] {
  const started = new Set(plays.map((p) => p.device_id));
  const visitors = new Set(visits.map((e) => e.device_id ?? `s:${e.session_id}`));
  for (const d of started) visitors.add(d);
  const answered = (slot: number) => new Set(answers.filter((a) => a.slot === slot && a.answered_at).map((a) => a.device_id)).size;
  return [
    { label: 'Visited', count: visitors.size },
    { label: 'Started', count: started.size },
    { label: 'Riddle 1', count: answered(1) },
    { label: 'Riddle 2', count: answered(2) },
    { label: 'Riddle 3', count: answered(3) },
    { label: 'Finished', count: new Set(plays.filter((p) => p.finished_at).map((p) => p.device_id)).size },
  ];
}

export interface RiddleStat {
  slot: number;
  riddleId: string;
  served: number;
  answered: number;
  /** Served but never answered (left mid-riddle; not even a timeout was recorded). */
  abandoned: number;
  avgCloseness: number | null;
  correctRate: number | null;
  trapRate: number | null;
  timeoutRate: number | null;
  medianTimeMs: number | null;
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const rate = (n: number, d: number) => (d ? n / d : null);

/** Per riddle (by slot), over the given answer rows. */
export function riddleStats(answers: Pick<Answer, 'slot' | 'riddle_id' | 'answered_at' | 'served_at' | 'closeness' | 'verdict' | 'trapped'>[]): RiddleStat[] {
  const groups = new Map<string, typeof answers>();
  for (const a of answers) {
    const k = `${a.slot}|${a.riddle_id}`;
    groups.set(k, [...(groups.get(k) ?? []), a]);
  }
  return [...groups.entries()]
    .map(([k, rows]) => {
      const [slot, riddleId] = k.split('|');
      const done = rows.filter((a) => a.answered_at);
      const closeness = done.map((a) => a.closeness).filter((c): c is number => c !== null);
      const times = done.filter((a) => a.verdict !== 'timeout').map((a) => Date.parse(a.answered_at!) - Date.parse(a.served_at)).filter((t) => t >= 0);
      return {
        slot: Number(slot),
        riddleId,
        served: rows.length,
        answered: done.length,
        abandoned: rows.length - done.length,
        avgCloseness: closeness.length ? closeness.reduce((s, c) => s + c, 0) / closeness.length : null,
        correctRate: rate(done.filter((a) => a.verdict === 'correct').length, done.length),
        trapRate: rate(done.filter((a) => a.trapped).length, done.length),
        timeoutRate: rate(done.filter((a) => a.verdict === 'timeout').length, done.length),
        medianTimeMs: median(times),
      };
    })
    .sort((a, b) => a.slot - b.slot || a.riddleId.localeCompare(b.riddleId));
}

/** Consecutive days played ending at `date`, from that device's set of played dates. */
export function streakAt(dates: Set<string>, date: string): number {
  let n = 0;
  for (let d = date; dates.has(d); d = addDays(d, -1)) n++;
  return n;
}

export interface Retention {
  /** Devices that played in the range. */
  players: number;
  /** Of those, how many had played on a day before their first day in the range. */
  returning: number;
  /** Streak (as of each device's last day in range) bucketed: 1, 2, 3–6, 7–13, 14+. */
  streaks: { label: string; count: number }[];
}

/** `history` = every play up to `toDate` (so returning/streaks can look back before the range). */
export function retention(history: Pick<Play, 'device_id' | 'puzzle_date'>[], fromDate: string, toDate: string): Retention {
  const byDevice = new Map<string, Set<string>>();
  for (const p of history) {
    if (p.puzzle_date > toDate) continue;
    let s = byDevice.get(p.device_id);
    if (!s) byDevice.set(p.device_id, (s = new Set()));
    s.add(p.puzzle_date);
  }
  const buckets = [
    { label: '1 day', min: 1, max: 1 },
    { label: '2 days', min: 2, max: 2 },
    { label: '3–6', min: 3, max: 6 },
    { label: '7–13', min: 7, max: 13 },
    { label: '14+', min: 14, max: Infinity },
  ].map((b) => ({ ...b, count: 0 }));
  let players = 0;
  let returning = 0;
  for (const dates of byDevice.values()) {
    const inRange = [...dates].filter((d) => d >= fromDate && d <= toDate).sort();
    if (!inRange.length) continue;
    players++;
    if ([...dates].some((d) => d < inRange[0])) returning++;
    const s = streakAt(dates, inRange[inRange.length - 1]);
    buckets.find((b) => s >= b.min && s <= b.max)!.count++;
  }
  return { players, returning, streaks: buckets.map(({ label, count }) => ({ label, count })) };
}

export interface AttentionStat {
  /** Plays where the tab was hidden at least once while a riddle's clock ran. */
  hiddenPlays: number;
  hiddenEvents: number;
  /** Total time away, from tab_returned's hiddenMs. */
  hiddenMs: number;
  /** Tabs closed or navigated away mid-climb (page_left). */
  pageLeft: number;
}

export function attention(events: EventRow[]): AttentionStat {
  const hidden = events.filter((e) => e.name === 'tab_hidden');
  return {
    hiddenPlays: new Set(hidden.map((e) => e.play_id ?? `s:${e.session_id}`)).size,
    hiddenEvents: hidden.length,
    hiddenMs: events.filter((e) => e.name === 'tab_returned').reduce((s, e) => s + (typeof e.props.hiddenMs === 'number' ? e.props.hiddenMs : 0), 0),
    pageLeft: events.filter((e) => e.name === 'page_left').length,
  };
}

export interface PlayRow {
  play: Play;
  answers: Answer[];
  status: 'finished' | 'in progress' | 'abandoned';
  hiddenCount: number;
  device: string | null;
  country: string | null;
}

/** A play counts as abandoned once its day is over without finishing. */
export function playStatus(p: Play, today: string): PlayRow['status'] {
  if (p.finished_at) return 'finished';
  return p.puzzle_date < today ? 'abandoned' : 'in progress';
}

export function playRows(plays: Play[], answers: AnswerWithPlay[], events: EventRow[], today: string): PlayRow[] {
  return plays
    .map((play) => {
      const mine = events.filter((e) => e.play_id === play.id || (e.device_id === play.device_id && !e.play_id));
      const last = [...mine].reverse().find((e) => e.device_kind || e.country);
      return {
        play,
        answers: answers.filter((a) => a.play_id === play.id).sort((a, b) => a.slot - b.slot),
        status: playStatus(play, today),
        hiddenCount: mine.filter((e) => e.name === 'tab_hidden').length,
        device: last?.device_kind ?? null,
        country: last?.country ?? null,
      };
    })
    .sort((a, b) => a.play.started_at.localeCompare(b.play.started_at));
}

export interface TimelineItem {
  ts: string;
  kind: 'event' | 'play' | 'answer';
  label: string;
  detail: string;
  /** Milliseconds since the previous item. */
  gapMs: number | null;
}

const pct = (c: number | null) => (c === null ? '' : ` closeness ${Math.round(c * 100)}%`);

function describeEvent(e: EventRow): string {
  const p = e.props;
  const bits: string[] = [];
  if (p.slot !== undefined) bits.push(`riddle ${p.slot}`);
  if (typeof p.hiddenMs === 'number') bits.push(`away ${formatMs(p.hiddenMs)}`);
  if (typeof p.elapsedMs === 'number') bits.push(`${formatMs(p.elapsedMs)} into it`);
  if (typeof p.timeMs === 'number') bits.push(`in ${formatMs(p.timeMs)}`);
  if (p.phase) bits.push(`phase ${p.phase}`);
  if (p.reason) bits.push(String(p.reason));
  if (p.verdict) bits.push(String(p.verdict));
  if (p.method) bits.push(String(p.method));
  if (typeof p.totalScore === 'number') bits.push(`score ${p.totalScore}`);
  if (e.path && e.name !== 'visit_home') bits.push(e.path);
  return bits.join(' · ');
}

/** One device's day: its events merged with the server's own play/answer records. */
export function timeline(play: Play | null, answers: Answer[], events: EventRow[]): TimelineItem[] {
  const items: Omit<TimelineItem, 'gapMs'>[] = events.map((e) => ({ ts: e.ts, kind: 'event', label: e.name.replace(/_/g, ' '), detail: describeEvent(e) }));
  if (play) {
    items.push({ ts: play.started_at, kind: 'play', label: 'play created', detail: `puzzle ${play.puzzle_date}` });
    if (play.finished_at) items.push({ ts: play.finished_at, kind: 'play', label: 'play finished', detail: `score ${play.total_score ?? '–'}` });
  }
  for (const a of answers) {
    items.push({ ts: a.served_at, kind: 'answer', label: `riddle ${a.slot} served`, detail: a.riddle_id });
    if (a.answered_at) {
      const typed = a.raw_input === null ? 'no answer' : `“${a.raw_input}”`;
      items.push({
        ts: a.answered_at,
        kind: 'answer',
        label: `riddle ${a.slot} ${a.verdict ?? 'answered'}`,
        detail: `${typed}${pct(a.closeness)} · ${a.points ?? 0} pts · ${formatMs(Date.parse(a.answered_at) - Date.parse(a.served_at))}${a.judge_source ? ` · ${a.judge_source}` : ''}`,
      });
    }
  }
  items.sort((a, b) => a.ts.localeCompare(b.ts));
  return items.map((it, i) => ({ ...it, gapMs: i ? Date.parse(it.ts) - Date.parse(items[i - 1].ts) : null }));
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
  return `${Math.floor(ms / 3_600_000)}h ${Math.round((ms % 3_600_000) / 60_000)}m`;
}

export type RangeKey = 'today' | 'yesterday' | '7d' | '28d' | 'all';
export const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: '7 days' },
  { key: '28d', label: '28 days' },
  { key: 'all', label: 'All time' },
];

/** Inclusive puzzle-date range for a range key. */
export function rangeDates(key: RangeKey, today: string, launch: string): { from: string; to: string } {
  const clamp = (d: string) => (daysBetween(launch, d) < 0 ? launch : d);
  switch (key) {
    case 'yesterday':
      return { from: clamp(addDays(today, -1)), to: clamp(addDays(today, -1)) };
    case '7d':
      return { from: clamp(addDays(today, -6)), to: today };
    case '28d':
      return { from: clamp(addDays(today, -27)), to: today };
    case 'all':
      return { from: launch, to: today };
    default:
      return { from: today, to: today };
  }
}
