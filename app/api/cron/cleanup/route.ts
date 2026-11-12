/**
 * GET /api/cron/cleanup: daily Vercel cron (vercel.json). Deletes analytics events older than
 * EVENTS_RETENTION_DAYS (default 180). Vercel sends `Authorization: Bearer $CRON_SECRET`.
 */
import { NextResponse } from 'next/server';
import { getStore } from '@/lib/db';

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new NextResponse('Unauthorized', { status: 401 });
  const days = Math.max(30, Number(process.env.EVENTS_RETENTION_DAYS) || 180);
  const before = new Date(Date.now() - days * 86_400_000).toISOString();
  try {
    const deleted = await (await getStore()).deleteEventsBefore(before);
    return NextResponse.json({ deleted, before });
  } catch (e) {
    console.error('cleanup failed', e);
    return NextResponse.json({ error: 'cleanup failed' }, { status: 500 });
  }
}
