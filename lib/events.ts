/**
 * The analytics event set (brief §9, extended by docs/superpowers/specs/2026-11-07-analytics-design.md)
 * and the validation `/api/events` applies. Shared by the browser (`lib/track.ts`) and the server.
 */

export const EVENT_NAMES = [
  'visit_home', 'play_start', 'riddle_served', 'input_rejected', 'riddle_answered',
  'math_expanded', 'verdict_reported', 'play_finished', 'share_clicked',
  'tab_hidden', 'tab_returned', 'page_left', 'play_resumed',
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export type EventProps = Record<string, string | number | boolean | null | undefined>;

/** One event as the browser sends it. */
export interface ClientEvent {
  name: EventName;
  props?: EventProps;
  ts?: number;
  path?: string;
}

export interface EventBatch {
  sessionId: string;
  /** Client clock when the batch was sent, to map event times onto the server's clock. */
  sentAt?: number;
  events: ClientEvent[];
}

export const MAX_BATCH = 20;
const MAX_PROPS = 16;
const MAX_KEY = 40;
const MAX_STRING = 120;
const MAX_PATH = 200;
const NAMES = new Set<string>(EVENT_NAMES);
const SESSION = /^[A-Za-z0-9-]{1,64}$/;

export interface CleanEvent {
  name: EventName;
  props: Record<string, string | number | boolean | null>;
  /** When it happened, on the server's clock (client time + the batch's clock offset); null = on arrival. */
  ts: string | null;
  clientTs: string | null;
  path: string | null;
}

function cleanProps(raw: unknown): CleanEvent['props'] {
  const out: CleanEvent['props'] = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  let n = 0;
  for (const [k, v] of Object.entries(raw)) {
    if (n >= MAX_PROPS) break;
    if (!/^[A-Za-z0-9_]+$/.test(k) || k.length > MAX_KEY) continue;
    if (typeof v === 'string') out[k] = v.slice(0, MAX_STRING);
    else if (typeof v === 'number') {
      if (!Number.isFinite(v)) continue;
      out[k] = v;
    } else if (typeof v === 'boolean' || v === null) out[k] = v;
    else continue;
    n++;
  }
  return out;
}

/**
 * Validates a request body. Unknown names and malformed events are dropped one by one;
 * a malformed envelope yields null. Never throws.
 */
export function parseBatch(body: unknown, now = Date.now()): { sessionId: string; events: CleanEvent[] } | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const sessionId = typeof b.sessionId === 'string' && SESSION.test(b.sessionId) ? b.sessionId : null;
  if (!sessionId || !Array.isArray(b.events)) return null;
  // Events are batched, so arrival time lags; shift each event's client time by the batch's clock offset.
  const offset = typeof b.sentAt === 'number' && Number.isFinite(b.sentAt) ? now - b.sentAt : null;
  const events: CleanEvent[] = [];
  for (const raw of b.events.slice(0, MAX_BATCH)) {
    if (!raw || typeof raw !== 'object') continue;
    const e = raw as Record<string, unknown>;
    if (typeof e.name !== 'string' || !NAMES.has(e.name)) continue;
    // Client clocks are only kept when plausible (within a day of the server's).
    const clientMs = typeof e.ts === 'number' && Math.abs(e.ts - now) < 86_400_000 ? e.ts : null;
    // The corrected time must fall within the last hour (a batch never waits that long) and not in the future.
    const at = clientMs !== null && offset !== null ? clientMs + offset : null;
    const ts = at !== null && at <= now && now - at < 3_600_000 ? new Date(at).toISOString() : null;
    const path = typeof e.path === 'string' && e.path.startsWith('/') ? e.path.slice(0, MAX_PATH) : null;
    events.push({ name: e.name as EventName, props: cleanProps(e.props), ts, clientTs: clientMs === null ? null : new Date(clientMs).toISOString(), path });
  }
  return { sessionId, events };
}

/** 'phone' or 'desktop' from a User-Agent (tablets count as phones: same layout). */
export function deviceKind(ua: string | null): 'phone' | 'desktop' {
  return ua && /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? 'phone' : 'desktop';
}

/** A fixed-window counter per key, in memory (per server instance). Returns false once over `limit`. */
export class RateLimiter {
  private hits = new Map<string, { start: number; n: number }>();
  constructor(private limit: number, private windowMs: number) {}
  allow(key: string, n = 1, now = Date.now()): boolean {
    let h = this.hits.get(key);
    if (!h || now - h.start >= this.windowMs) {
      if (this.hits.size > 10_000) this.hits.clear();
      h = { start: now, n: 0 };
      this.hits.set(key, h);
    }
    h.n += n;
    return h.n <= this.limit;
  }
}
