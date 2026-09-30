import { describe, expect, it } from 'vitest';
import {
  closeness, isTrapped, points, timeBonus, level, percentile, invNormCdf, rq, altitudeGain, wordCloseness,
} from './scoring';
import {
  flameIntensity, flameHeight, flamePixels, shakeAmplitudePx, shakeDurationMs, shakeOffset,
  flashOpacity, climbProgress, dipPx, levelColor, LEVEL_COLOR, panDownProgress, panUpProgress, cameraOffsetY, BLUE_CORE, PILOT_COLOR,
} from './burner';

describe('closeness (§4.2)', () => {
  it('percent is linear in percentage points, capped at 50', () => {
    expect(closeness('percent', 21, 9.02, 50)).toBeCloseTo(0.7604, 4);
    expect(closeness('percent', 99, 9.02, 50)).toBe(0);
    expect(closeness('percent', 9.02, 9.02, 50)).toBe(1);
  });
  it('quantity is log10 distance, capped per riddle', () => {
    expect(closeness('quantity', 100, 5, 2)).toBeCloseTo(0.3495, 4);
    expect(closeness('quantity', 4, 6, 0.5)).toBeCloseTo(0.6478, 4);
    expect(closeness('quantity', 0, 6, 0.5)).toBe(0);
    expect(closeness('quantity', 50, 5, 2)).toBeCloseTo(0.5, 6);
  });
  it('word answers are all or nothing (§4.3)', () => {
    expect(wordCloseness('correct')).toBe(1);
    expect(wordCloseness('trapped')).toBe(0);
  });
});

describe('trap detection (§4.6)', () => {
  it('flags guesses near the trap and nearer to it than the truth', () => {
    expect(isTrapped('percent', 99, 9.02, 99, 50)).toBe(true);
    expect(isTrapped('percent', 90, 9.02, 99, 50)).toBe(true);
    expect(isTrapped('percent', 21, 9.02, 99, 50)).toBe(false);
    expect(isTrapped('quantity', 100, 5, 100, 2)).toBe(true);
  });
});

describe('points (§4.4)', () => {
  it('scales the time bonus by closeness', () => {
    expect(timeBonus(1, 15, 60)).toBe(38);
    expect(timeBonus(0, 1, 60)).toBe(0);
    expect(points(1, 15, 60, false)).toBe(138);
    expect(points(1, 0, 60, false)).toBe(150);
    expect(points(0.5, 60, 60, true)).toBe(25);
    expect(points(0.1, 60, 60, true)).toBe(0);
  });
  it('converts points to altitude (§4.9)', () => {
    expect(altitudeGain(450)).toBe(112500);
  });
});

describe('levels (§4.5)', () => {
  it('maps closeness to the six levels', () => {
    expect(level(0)).toBe('Goldfish');
    expect(level(0.2)).toBe('Guesser');
    expect(level(0.59)).toBe('Analyst');
    expect(level(0.76)).toBe('Quant');
    expect(level(0.96)).toBe('Genius');
    expect(level(0.97)).toBe('Oracle');
    expect(level(1)).toBe('Oracle');
  });
});

describe('percentile and RQ (§4.7)', () => {
  it('uses mid-rank ties', () => {
    expect(percentile(5, [1, 5, 5, 10])).toBe(50);
    expect(percentile(10, [1, 5, 5, 10])).toBe(87.5);
  });
  it('inverts the normal CDF accurately', () => {
    expect(invNormCdf(0.5)).toBeCloseTo(0, 6);
    expect(invNormCdf(0.975)).toBeCloseTo(1.959964, 5);
    expect(invNormCdf(0.01)).toBeCloseTo(-2.326348, 5);
  });
  it('rescales to RQ with clamps', () => {
    expect(rq(50)).toBe(100);
    expect(rq(84)).toBe(115);
    expect(rq(98)).toBe(131);
    expect(rq(0)).toBe(70);
    expect(rq(100)).toBe(139);
  });
});

describe('burner reaction (§5.4)', () => {
  it('sizes the flame by closeness', () => {
    expect(flameIntensity(1, 1000)).toBe(1);
    expect(flameHeight(flameIntensity(1, 1000))).toBe(11);
    expect(flameIntensity(0.5, 500)).toBeCloseTo(0.575, 6);
    expect(flameIntensity(0, 1000)).toBe(0);
    expect(flameIntensity(1, -10)).toBe(0);
  });
  it('burns blue-white at Oracle and shows a pilot light when idle', () => {
    expect(flamePixels(1, 400).some((p) => p.color === BLUE_CORE)).toBe(true);
    expect(flamePixels(0.9, 400).some((p) => p.color === BLUE_CORE)).toBe(false);
    expect(flamePixels(0.5, -1).every((p) => p.color === PILOT_COLOR)).toBe(true);
  });
  it('shakes toward either extreme and not in the middle', () => {
    expect(shakeAmplitudePx(0)).toBe(18);
    expect(shakeAmplitudePx(1)).toBe(18);
    expect(shakeAmplitudePx(0.5)).toBe(0);
    expect(shakeDurationMs(1)).toBe(800);
    expect(shakeOffset(0.5, 500)).toEqual({ x: 0, y: 0 });
    expect(shakeOffset(1, 500, true)).toEqual({ x: 0, y: 0 });
    // Smooth: the offset changes a little from one frame (16 ms) to the next and stays within the amplitude.
    const a = shakeOffset(0, 330);
    const b = shakeOffset(0, 331);
    expect(Math.hypot(a.x, a.y)).toBeLessThanOrEqual(18 * Math.SQRT2);
    expect(Math.abs(b.x - a.x)).toBeLessThan(3);
  });
  it('gives each closeness level its own color, grey (way off) to red (spot on)', () => {
    expect(levelColor(0)).toBe(LEVEL_COLOR.Goldfish);
    expect(levelColor(0.5)).toBe(LEVEL_COLOR.Analyst);
    expect(levelColor(0.96)).toBe(LEVEL_COLOR.Genius);
    expect(levelColor(1)).toBe(LEVEL_COLOR.Oracle);
    expect(new Set(Object.values(LEVEL_COLOR)).size).toBe(6);
  });
  it('times the flash, climb and dip', () => {
    expect(flashOpacity(300)).toBe(0);
    expect(flashOpacity(301)).toBeCloseTo(0.38, 2);
    expect(flashOpacity(1200)).toBe(0);
    expect(climbProgress(300)).toBe(0);
    expect(climbProgress(2100)).toBe(1);
    expect(dipPx(0.1, 600)).toBe(14);
    expect(dipPx(0.5, 600)).toBe(0);
  });
});

describe('camera (§5.3)', () => {
  it('pans from the Question shot to the Balloon shot and back', () => {
    expect(panDownProgress(0)).toBe(0);
    expect(panDownProgress(650)).toBe(1);
    expect(panUpProgress(650)).toBe(0);
    expect(cameraOffsetY(0, 328)).toBe(328);
    expect(cameraOffsetY(1, 328)).toBe(0);
  });
});
