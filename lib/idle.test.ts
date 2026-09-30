import { describe, expect, it } from 'vitest';
import {
  balloonBob, BOB_PX, pilotColor, PILOT_A, PILOT_B, cloudX, CLOUD_W, starOpacity, waveOffset, WAVE_TILE, glintOn, glintLevel,
  landmarkFlash, flyerKind, flyerX, FLYER_CROSS_MS,
} from './idle';

const times = Array.from({ length: 400 }, (_, i) => i * 37);

describe('idle life', () => {
  it('moves smoothly: small changes between nearby frames', () => {
    for (const t of times) {
      expect(Math.abs(balloonBob(t + 16, false) - balloonBob(t, false))).toBeLessThan(0.2);
      const c0 = cloudX(t, 2, 300, 1280, false);
      const c1 = cloudX(t + 16, 2, 300, 1280, false);
      if (c1 > c0) expect(c1 - c0).toBeLessThan(1);
      const w = waveOffset(t, false);
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThan(WAVE_TILE);
    }
  });

  it('bobs the balloon by at most a few px and actually moves', () => {
    const vals = new Set(times.map((t) => balloonBob(t, false)));
    expect([...vals].every((v) => Math.abs(v) <= BOB_PX)).toBe(true);
    expect(vals.size).toBeGreaterThan(1);
  });

  it('flickers the pilot light between two blues', () => {
    expect(new Set(times.map((t) => pilotColor(t, false)))).toEqual(new Set([PILOT_A, PILOT_B]));
  });

  it('drifts clouds and wraps them around the screen', () => {
    const W = 800;
    for (const t of times.map((x) => x * 50)) {
      const x = cloudX(t, 1, 100, W, false);
      expect(x).toBeGreaterThanOrEqual(-CLOUD_W);
      expect(x).toBeLessThan(W);
    }
    expect(cloudX(10_000, 0, 100, W, false)).not.toBe(100);
  });

  it('swells sea glints smoothly between 0 and 1', () => {
    const v = times.map((t) => glintLevel(t, 1, false));
    expect(v.every((x) => x >= 0 && x <= 1)).toBe(true);
    expect(Math.max(...v)).toBeGreaterThan(0.5);
    expect(times.every((t) => Math.abs(glintLevel(t + 16, 1, false) - glintLevel(t, 1, false)) < 0.1)).toBe(true);
    expect(glintLevel(500, 1, true)).toBe(0);
  });

  it('twinkles only some stars, and blinks glints', () => {
    expect(times.every((t) => starOpacity(t, 1, false) === 1)).toBe(true);
    expect(times.some((t) => starOpacity(t, 6, false) < 1)).toBe(true);
    expect(times.some((t) => glintOn(t, 2, false))).toBe(true);
  });

  it('flashes a passed landmark in steps, then stops', () => {
    expect(landmarkFlash(0, false)).toBe(true);
    expect(landmarkFlash(130, false)).toBe(false);
    expect(landmarkFlash(250, false)).toBe(true);
    expect(landmarkFlash(400, false)).toBe(false);
    expect(landmarkFlash(-1, false)).toBe(false);
  });

  it('picks a flyer by altitude and crosses the whole screen', () => {
    expect(flyerKind(100)).toBe('gull');
    expect(flyerKind(11000)).toBe('plane');
    expect(flyerKind(80000)).toBe('satellite');
    expect(flyerX(0, 1000, 32, false)).toBe(-32);
    expect(flyerX(FLYER_CROSS_MS - 1, 1000, 32, false)!).toBeGreaterThan(990);
    expect(flyerX(FLYER_CROSS_MS + 10, 1000, 32, false)).toBeNull();
  });

  it('is completely still under reduced motion', () => {
    for (const t of times) {
      expect(balloonBob(t, true)).toBe(0);
      expect(pilotColor(t, true)).toBe(PILOT_A);
      expect(cloudX(t, 3, 240, 1280, true)).toBe(240);
      expect(starOpacity(t, 6, true)).toBe(1);
      expect(waveOffset(t, true)).toBe(0);
      expect(glintOn(t, 1, true)).toBe(false);
      expect(landmarkFlash(t % 300, true)).toBe(false);
      expect(flyerX(t, 1280, 32, true)).toBeNull();
    }
  });
});
