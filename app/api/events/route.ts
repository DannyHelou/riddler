/**
 * POST /api/events: first-party analytics intake (lib/track.ts → events table).
 * Always answers 204, whatever happens: analytics must never break or slow the game.
 * The device ID comes from the request's cookie, never from the body.
 */
import { deviceId } from '@/lib/api';
import { getStore } from '@/lib/db';
import { RateLimiter, deviceKind, parseBatch } from '@/lib/events';
import { todayPuzzleDate } from '@/lib/dates';

const NO_CONTENT = () => new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
const MAX_BODY = 16_000;

// Per device (or session, without a cookie): a full climb sends ~25 events, so this is generous.
const limiter = new RateLimiter(240, 10 * 60_000);

// device|date → play id, so most events don't need a lookup. Only hits are cached.
const playIds = new Map<string, string>();

async function playIdFor(device: string): Promise<string | null> {
  const key = `${device}|${todayPuzzleDate()}`;
  const hit = playIds.get(key);
  if (hit) return hit;
  const play = await (await getStore()).getPlay(device, todayPuzzleDate());
  if (play) {
    if (playIds.size > 20_000) playIds.clear();
    playIds.set(key, play.id);
  }
  return play?.id ?? null;
}

export async function POST(req: Request) {
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) return NO_CONTENT();
    const batch = parseBatch(JSON.parse(text));
    if (!batch || !batch.events.length) return NO_CONTENT();

    const device = await deviceId();
    if (!limiter.allow(device ?? batch.sessionId, batch.events.length)) return NO_CONTENT();

    // Before play_start the play doesn't exist yet; later events in the same climb pick it up.
    const playId = device ? await playIdFor(device).catch(() => null) : null;
    const country = req.headers.get('x-vercel-ip-country');
    const kind = deviceKind(req.headers.get('user-agent'));
    await (await getStore()).insertEvents(
      batch.events.map((e) => ({
        ...(e.ts ? { ts: e.ts } : {}),
        client_ts: e.clientTs,
        device_id: device,
        session_id: batch.sessionId,
        play_id: playId,
        name: e.name,
        props: e.props,
        path: e.path,
        country: country && /^[A-Z]{2}$/.test(country) ? country : null,
        device_kind: kind,
      })),
    );
  } catch (e) {
    console.warn('events: dropped', e instanceof Error ? e.message : e);
  }
  return NO_CONTENT();
}
