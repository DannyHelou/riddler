import { describe, expect, it } from 'vitest';
import { baselinePercentile, blendedPercentile, FALLBACK_MEAN, FALLBACK_SD, normCdf } from './earlyRq';
import { percentile } from './scoring';

describe('early RQ (lib/earlyRq.ts)', () => {
  it('normCdf matches known values', () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 6);
    expect(normCdf(1)).toBeCloseTo(0.841345, 5);
    expect(normCdf(-1.96)).toBeCloseTo(0.024998, 5);
  });

  it('uses the fallback normal curve when past days are thin', () => {
    expect(baselinePercentile(FALLBACK_MEAN, [])).toBeCloseTo(50, 4);
    expect(baselinePercentile(FALLBACK_MEAN + FALLBACK_SD, new Array(29).fill(0))).toBeCloseTo(84.13, 1);
  });

  it('uses past real scores once there are 30 of them', () => {
    const past = Array.from({ length: 40 }, (_, i) => i * 10);
    expect(baselinePercentile(200, past)).toBe(percentile(200, past));
  });

  it('blends today with the baseline in proportion to today\'s players', () => {
    const past = Array.from({ length: 100 }, (_, i) => i * 4); // 0..396
    const today = [100, 200, 300, 400, 250, 250, 250, 250, 250, 250]; // n = 10
    const { percentile: p, estimated } = blendedPercentile(250, today, past);
    expect(estimated).toBe(true);
    expect(p).toBeCloseTo((10 * percentile(250, today) + 20 * percentile(250, past)) / 30, 10);
  });

  it('is pure baseline for the first player and pure today from 30 players', () => {
    expect(blendedPercentile(180, [180], []).percentile).toBeCloseTo((1 * 50 + 29 * 50) / 30, 4);
    const thirty = Array.from({ length: 30 }, (_, i) => i * 15);
    expect(blendedPercentile(200, thirty, [])).toEqual({ percentile: percentile(200, thirty), estimated: false });
  });
});
