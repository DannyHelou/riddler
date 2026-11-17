/**
 * Error alerts. Every unexpected server error (a 500 from `handle()`, a failed cron check)
 * is recorded as a `server_error` row in the `events` table, so the owner dashboard can show
 * it, and posted to ALERT_WEBHOOK_URL when that is set (Slack- and Discord-compatible JSON;
 * a placeholder until the owner picks one). Never throws. Server only.
 */
import { getStore } from './db';
import { assertServer } from './secrets';

assertServer('lib/alerts');

export const SERVER_EVENT = 'server_error';

/** Don't send the same message to the webhook more than once per 10 minutes (per instance). */
const recent = new Map<string, number>();
const DEDUPE_MS = 10 * 60_000;

export async function reportError(where: string, error: unknown, extra: Record<string, string | number | boolean | null> = {}): Promise<void> {
  const message = (error instanceof Error ? error.message : String(error)).slice(0, 300);
  console.error(`[${where}]`, error);
  try {
    await (await getStore()).insertEvents([
      { client_ts: null, device_id: null, session_id: 'server', play_id: null, name: SERVER_EVENT, props: { where, message, ...extra }, path: null, country: null, device_kind: null },
    ]);
  } catch (e) {
    console.error('alerts: could not record the error', e instanceof Error ? e.message : e);
  }
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  const key = `${where}|${message}`;
  const now = Date.now();
  if ((recent.get(key) ?? 0) > now - DEDUPE_MS) return;
  recent.set(key, now);
  try {
    const text = `Riddler · ${where}: ${message}`;
    await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, content: text }), signal: AbortSignal.timeout(4000) });
  } catch (e) {
    console.error('alerts: webhook failed', e instanceof Error ? e.message : e);
  }
}
