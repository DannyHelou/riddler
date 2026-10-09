import { describe, expect, it } from 'vitest';
import {
  baselinePercentile, blendedPercentile, CURVE_COLUMNS, FALLBACK_MEAN, FALLBACK_SD, normCdf, scoreColumn, scoreCurve, topPercent,
} from './earlyEstimate';
import { percentile } from './scoring';

describe('early estimate (lib/earlyEstimate.ts)', () => {
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

  it("blends today with the baseline in proportion to today's players", () => {
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

  it('turns a percentile into "top N%", never below 1', () => {
    expect(topPercent(73)).toBe(27);
    expect(topPercent(50)).toBe(50);
    expect(topPercent(99.8)).toBe(1);
    expect(topPercent(0)).toBe(100);
  });

  it('places scores on 45 columns of 10 points', () => {
    expect(scoreColumn(0)).toBe(0);
    expect(scoreColumn(185)).toBe(18);
    expect(scoreColumn(450)).toBe(CURVE_COLUMNS - 1);
  });

  it('draws the fallback curve, peaking at the fallback mean, with no players', () => {
    const c = scoreCurve([], []);
    expect(c).toHaveLength(CURVE_COLUMNS);
    expect(Math.max(...c)).toBe(1);
    // The mean (180) sits on the edge between columns 17 and 18, so they share the peak.
    expect(c[scoreColumn(FALLBACK_MEAN) - 1]).toBe(1);
    expect(c[scoreColumn(FALLBACK_MEAN)]).toBe(1);
    expect(c[0]).toBeLessThan(0.1);
  });

  it("follows today's players from 30 on", () => {
    const today = Array.from({ length: 40 }, (_, i) => 380 + (i % 5)); // everyone near 380
    const c = scoreCurve(today, []);
    expect(c.indexOf(1)).toBe(scoreColumn(382));
    expect(c[scoreColumn(FALLBACK_MEAN)]).toBeLessThan(0.01);
  });
});
