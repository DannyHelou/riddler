import { describe, expect, it } from 'vitest';
import { DEVICE_LIMITS, IP_LIMIT, Limits } from './ratelimit';

describe('game API rate limits', () => {
  it('caps a device per route per 10 minutes, then lets it back in', () => {
    const l = new Limits();
    for (let i = 0; i < DEVICE_LIMITS.start; i++) expect(l.check('start', 'dev', null, 0)).toBe(true);
    expect(l.check('start', 'dev', null, 1000)).toBe(false);
    // Other routes and other devices are unaffected.
    expect(l.check('today', 'dev', null, 1000)).toBe(true);
    expect(l.check('start', 'other', null, 1000)).toBe(true);
    expect(l.check('start', 'dev', null, 10 * 60_000 + 1)).toBe(true);
  });

  it('caps an IP across routes per minute', () => {
    const l = new Limits();
    for (let i = 0; i < IP_LIMIT; i++) expect(l.check('results', `d${i}`, '1.2.3.4', 0)).toBe(true);
    expect(l.check('today', 'fresh', '1.2.3.4', 500)).toBe(false);
    expect(l.check('today', 'fresh', '5.6.7.8', 500)).toBe(true);
    expect(l.check('today', 'fresh', '1.2.3.4', 60_001)).toBe(true);
  });
});
