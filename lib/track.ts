'use client';
/**
 * Analytics behind one track() helper (§9). PostHog when NEXT_PUBLIC_POSTHOG_KEY is set,
 * otherwise a no-op (logged in development). Never sends the device ID or raw answer text:
 * the distinct ID is a random per-browser-session value.
 */

export type EventName =
  | 'visit_home' | 'play_start' | 'riddle_served' | 'input_rejected' | 'riddle_answered'
  | 'math_expanded' | 'verdict_reported' | 'play_finished' | 'share_clicked';

type Props = Record<string, string | number | boolean | null | undefined>;

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

export function track(event: EventName, props: Props = {}) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'development') console.debug('[track]', event, props);
    return;
  }
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
  const payload = JSON.stringify({ api_key: key, event, distinct_id: sessionId(), properties: { ...props, $process_person_profile: false } });
  try {
    if (!navigator.sendBeacon?.(`${host}/capture/`, new Blob([payload], { type: 'application/json' }))) {
      void fetch(`${host}/capture/`, { method: 'POST', body: payload, keepalive: true, headers: { 'content-type': 'application/json' } });
    }
  } catch {
    /* analytics must never break the game */
  }
}
