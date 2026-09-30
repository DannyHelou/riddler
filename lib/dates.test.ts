import { describe, expect, it } from 'vitest';
import { dateInZone, midnightInZone, nextResetAt, puzzleNumber, longDate } from './dates';

describe('daily date logic (§7.3)', () => {
  it('resolves the Toronto date, not UTC', () => {
    // 2026-10-02 03:30 UTC is still Oct 1 in Toronto (EDT, UTC-4).
    expect(dateInZone(new Date('2026-10-02T03:30:00Z'))).toBe('2026-10-01');
    expect(dateInZone(new Date('2026-10-02T04:30:00Z'))).toBe('2026-10-02');
  });
  it('numbers puzzles from the launch date', () => {
    expect(puzzleNumber('2026-10-01', '2026-10-01')).toBe(1);
    expect(puzzleNumber('2026-11-27', '2026-10-01')).toBe(58);
  });
  it('finds the next Toronto midnight, across DST', () => {
    expect(midnightInZone('2026-10-02').toISOString()).toBe('2026-10-02T04:00:00.000Z');
    expect(midnightInZone('2026-12-01').toISOString()).toBe('2026-12-01T05:00:00.000Z');
    expect(nextResetAt(new Date('2026-11-01T12:00:00Z')).toISOString()).toBe('2026-11-02T05:00:00.000Z');
  });
  it('formats long dates', () => {
    expect(longDate('2026-09-26')).toBe('Saturday, September 26');
  });
});
