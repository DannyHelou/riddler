'use client';
/**
 * Analytics behind one track() helper (§9). First-party: events go to our own `/api/events`,
 * which stores them in Supabase next to the plays (docs/superpowers/specs/2026-11-07-analytics-design.md).
 * The server reads the device ID from its own cookie; the body only carries a random per-tab
 * session ID and the event. Never sends raw answer text. Never throws or blocks the game.
 */
import type { ClientEvent, EventName, EventProps } from './events';

export type { EventName } from './events';

const ENDPOINT = '/api/events';
const FLUSH_MS = 1500;
const MAX_QUEUE = 20;

let queue: ClientEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let listening = false;

function sessionId(): string {
  try {
    let id = sessionStorage.getItem('burner_analytics');
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem('burner_analytics', id);
    }
    return id;
  } catch {
    return 'anonymous';
  }
}

/** Sends whatever is queued. Uses sendBeacon so it survives the tab closing. */
export function flush() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!queue.length) return;
  const payload = JSON.stringify({ sessionId: sessionId(), sentAt: Date.now(), events: queue });
  queue = [];
  try {
    if (!navigator.sendBeacon?.(ENDPOINT, new Blob([payload], { type: 'application/json' }))) {
      void fetch(ENDPOINT, { method: 'POST', body: payload, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {});
    }
  } catch {
    /* analytics must never break the game */
  }
}

export function track(event: EventName, props: EventProps = {}) {
  try {
    if (process.env.NODE_ENV === 'development') console.debug('[track]', event, props);
    queue.push({ name: event, props, ts: Date.now(), path: location.pathname });
    if (!listening) {
      listening = true;
      // Send before the page goes away or into the background.
      addEventListener('pagehide', flush);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flush();
      });
    }
    if (queue.length >= MAX_QUEUE) flush();
    else timer ??= setTimeout(flush, FLUSH_MS);
  } catch {
    /* analytics must never break the game */
  }
}

const LAUNCH_KEY = 'burner_launch';

/** The homepage's Start button creates the play itself; this tells the climb the play is fresh, not resumed. */
export function markLaunch() {
  try {
    sessionStorage.setItem(LAUNCH_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/** True (once) if the Start button was pressed in the last minute. */
export function takeLaunch(): boolean {
  try {
    const at = Number(sessionStorage.getItem(LAUNCH_KEY));
    sessionStorage.removeItem(LAUNCH_KEY);
    return Date.now() - at < 60_000;
  } catch {
    return false;
  }
}
