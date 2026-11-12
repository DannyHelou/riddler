import { describe, expect, it } from 'vitest';
import { MAX_BATCH, RateLimiter, deviceKind, parseBatch } from './events';

describe('event intake validation', () => {
  const now = Date.parse('2026-11-12T12:00:00Z');

  it('keeps known events and drops unknown ones', () => {
    const b = parseBatch({ sessionId: 'abc-123', events: [{ name: 'play_start', props: { puzzleNumber: 40 }, ts: now, path: '/play' }, { name: 'evil' }, null] }, now);
    expect(b!.events).toEqual([{ name: 'play_start', props: { puzzleNumber: 40 }, ts: null, clientTs: new Date(now).toISOString(), path: '/play' }]);
  });

  it('maps event times onto the server clock using the batch send time', () => {
    // Client clock runs 5 s fast; the event happened 1.5 s before the batch was sent.
    const sentAt = now + 5000;
    const b = parseBatch({ sessionId: 's', sentAt, events: [{ name: 'tab_hidden', ts: sentAt - 1500 }] }, now)!;
    expect(b.events[0].ts).toBe(new Date(now - 1500).toISOString());
    // A corrected time in the future is dropped (stored as arrival time).
    const f = parseBatch({ sessionId: 's', sentAt: now, events: [{ name: 'tab_hidden', ts: now + 1000 }] }, now)!;
    expect(f.events[0].ts).toBeNull();
  });

  it('rejects a bad envelope', () => {
    expect(parseBatch(null)).toBeNull();
    expect(parseBatch({ sessionId: 'bad id!', events: [] })).toBeNull();
    expect(parseBatch({ sessionId: 'ok', events: 'nope' })).toBeNull();
  });

  it('caps batch size, props and strings', () => {
    const many = Array.from({ length: 50 }, () => ({ name: 'tab_hidden' }));
    expect(parseBatch({ sessionId: 's', events: many })!.events).toHaveLength(MAX_BATCH);
    const props: Record<string, unknown> = { long: 'x'.repeat(500), nested: { a: 1 }, 'bad key': 1, inf: Infinity, ok: true, nil: null };
    for (let i = 0; i < 30; i++) props[`k${i}`] = i;
    const e = parseBatch({ sessionId: 's', events: [{ name: 'tab_hidden', props }] })!.events[0];
    expect((e.props.long as string).length).toBe(120);
    expect(e.props).not.toHaveProperty('nested');
    expect(e.props).not.toHaveProperty('bad key');
    expect(e.props).not.toHaveProperty('inf');
    expect(Object.keys(e.props).length).toBeLessThanOrEqual(16);
  });

  it('ignores implausible client clocks and non-path paths', () => {
    const e = parseBatch({ sessionId: 's', events: [{ name: 'visit_home', ts: now - 3 * 86_400_000, path: 'https://evil' }] }, now)!.events[0];
    expect(e.clientTs).toBeNull();
    expect(e.path).toBeNull();
  });

  it('tells phones from desktops', () => {
    expect(deviceKind('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe('phone');
    expect(deviceKind('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
    expect(deviceKind(null)).toBe('desktop');
  });

  it('rate-limits per key within a window', () => {
    const r = new RateLimiter(3, 1000);
    expect(r.allow('a', 2, 0)).toBe(true);
    expect(r.allow('a', 1, 10)).toBe(true);
    expect(r.allow('a', 1, 20)).toBe(false);
    expect(r.allow('b', 1, 20)).toBe(true);
    expect(r.allow('a', 1, 1500)).toBe(true);
  });
});
