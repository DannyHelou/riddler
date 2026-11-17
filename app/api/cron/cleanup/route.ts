/**
 * GET /api/cron/cleanup: the daily Vercel cron (vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`.
 *  1. Deletes analytics events older than EVENTS_RETENTION_DAYS (default 180).
 *  2. Checks the schedule: tomorrow's set must exist, and fewer than SCHEDULE_WARN_DAYS of
 *     schedule left raises an alert (lib/alerts.ts), so the owner hears before it runs out.
 */
import { NextResponse } from 'next/server';
import { getStore } from '@/lib/db';
import { reportError } from '@/lib/alerts';
import { addDays, daysBetween, todayPuzzleDate } from '@/lib/dates';

const SCHEDULE_WARN_DAYS = 30;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new NextResponse('Unauthorized', { status: 401 });
  const store = await getStore();
  const out: Record<string, unknown> = {};
  try {
    const days = Math.max(30, Number(process.env.EVENTS_RETENTION_DAYS) || 180);
    const before = new Date(Date.now() - days * 86_400_000).toISOString();
    out.deleted = await store.deleteEventsBefore(before);
  } catch (e) {
    await reportError('cron/cleanup', e);
    out.cleanup = 'failed';
  }
  try {
    const today = todayPuzzleDate();
    const sets = await store.listDailySets();
    const last = sets.length ? sets[sets.length - 1].puzzle_date : null;
    const left = last ? daysBetween(today, last) : 0;
    out.scheduleEnds = last;
    out.daysLeft = left;
    if (!sets.some((s) => s.puzzle_date === addDays(today, 1))) {
      await reportError('schedule', new Error(`No riddle set for tomorrow (${addDays(today, 1)}). Run npm run schedule and re-seed.`));
    } else if (left < SCHEDULE_WARN_DAYS) {
      await reportError('schedule', new Error(`Only ${left} days of riddles left (ends ${last}). Add riddles, run npm run schedule, re-seed.`));
    }
  } catch (e) {
    await reportError('cron/schedule-check', e);
  }
  return NextResponse.json(out);
}
