/**
 * Daily date logic (§7.3). Server only in production; pure helpers so they can be unit-tested.
 * Reset time zone is an open decision (§12); the default is America/Toronto.
 */

export const PUZZLE_TZ = 'America/Toronto';

/** YYYY-MM-DD of `now` in `tz`. */
export function dateInZone(now: Date, tz = PUZZLE_TZ): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Whole days from `a` to `b` (both YYYY-MM-DD). */
export function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Puzzle number = days since launch date + 1. */
export function puzzleNumber(puzzleDate: string, launchDate: string): number {
  return daysBetween(launchDate, puzzleDate) + 1;
}

/** Offset of `tz` from UTC at instant `at`, in minutes (e.g. -240 for EDT). */
function zoneOffsetMinutes(at: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/** The instant of 00:00 on `date` in `tz`. */
export function midnightInZone(date: string, tz = PUZZLE_TZ): Date {
  const guess = new Date(`${date}T00:00:00Z`);
  // Two passes handle DST transitions.
  let t = guess.getTime() - zoneOffsetMinutes(guess, tz) * 60_000;
  t = guess.getTime() - zoneOffsetMinutes(new Date(t), tz) * 60_000;
  return new Date(t);
}

/** When the next set unlocks: the next 00:00 in `tz` after `now`. */
export function nextResetAt(now: Date, tz = PUZZLE_TZ): Date {
  return midnightInZone(addDays(dateInZone(now, tz), 1), tz);
}

export function launchDate(): string {
  return process.env.LAUNCH_DATE || '2026-10-01';
}

/** Today's puzzle date. PUZZLE_DATE_OVERRIDE exists for local testing only. */
export function todayPuzzleDate(now = new Date()): string {
  const o = process.env.PUZZLE_DATE_OVERRIDE;
  if (o && /^\d{4}-\d{2}-\d{2}$/.test(o) && process.env.NODE_ENV !== 'production') return o;
  return dateInZone(now);
}

/** "Saturday, September 26" for a YYYY-MM-DD. */
export function longDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
}
