/**
 * Idle life for the night climb: small, smooth motion that keeps the scene alive while
 * nothing is happening (smooth rather than stepped since 2026-09-29, at the owner's
 * request). Pure functions of time so the rAF loop can call them every frame and tests
 * can pin them down. Every function returns the static value when `reduced` is true
 * (prefers-reduced-motion, §5.4.6).
 */

const TAU = Math.PI * 2;

/** Balloon bob: a gentle ±4 px sine, a 3.2 s cycle. */
export const BOB_PX = 4;
export function balloonBob(now: number, reduced: boolean): number {
  if (reduced) return 0;
  return -BOB_PX * Math.sin((TAU * now) / 3200);
}

/** Pilot light: the two idle pixels alternate between two blues every 280 ms. */
export const PILOT_A = '#6FB7FF';
export const PILOT_B = '#9FD4FF';
export function pilotColor(now: number, reduced: boolean): string {
  if (reduced) return PILOT_A;
  return Math.floor(now / 280) % 2 ? PILOT_B : PILOT_A;
}

/**
 * Cloud drift: each cloud glides right at its own slow speed and wraps around the screen.
 * Returns the cloud's left edge in px.
 */
export const CLOUD_W = 96;
export function cloudX(now: number, index: number, baseX: number, W: number, reduced: boolean): number {
  if (reduced) return baseX;
  const pxPerMs = 2 / (110 + (index % 4) * 45);
  const span = W + CLOUD_W;
  const x = (((baseX + CLOUD_W + now * pxPerMs) % span) + span) % span;
  return x - CLOUD_W;
}

/** Star twinkle: one star in six breathes between full and 0.4 opacity, staggered. */
export function starOpacity(now: number, index: number, reduced: boolean): number {
  if (reduced || index % 6 !== 0) return 1;
  return 0.7 + 0.3 * Math.cos((TAU * (now + index * 397)) / 2250);
}

/** Sea wave line: the pattern slides 8 px per second (a 16 px tile). */
export const WAVE_TILE = 16;
export function waveOffset(now: number, reduced: boolean): number {
  if (reduced) return 0;
  return ((now / 250) * 2) % WAVE_TILE;
}

/** Sea glints: each glint is lit for one 200 ms step out of seven, staggered. */
export function glintOn(now: number, index: number, reduced: boolean): boolean {
  if (reduced) return false;
  return Math.floor((now + index * 530) / 200) % 7 === 0;
}

/** Glint brightness 0…1: each sea glint swells and fades smoothly on its own rhythm (fluid, not blinking). */
export function glintLevel(now: number, index: number, reduced: boolean): number {
  if (reduced) return 0;
  const v = Math.sin((TAU * (now + index * 530)) / (1400 + (index % 3) * 350));
  return Math.max(0, v) ** 2;
}

/** Stepped flash for a landmark the balloon just passed: lit, unlit, lit, then done (120 ms steps). */
export const LANDMARK_FLASH_MS = 360;
export function landmarkFlash(sincePass: number, reduced: boolean): boolean {
  if (reduced || sincePass < 0 || sincePass >= LANDMARK_FLASH_MS) return false;
  return Math.floor(sincePass / 120) % 2 === 0;
}

/** Ambient flyer, picked by altitude band. */
export type FlyerKind = 'gull' | 'plane' | 'satellite';
export function flyerKind(altitudeM: number): FlyerKind {
  if (altitudeM < 2000) return 'gull';
  if (altitudeM < 30000) return 'plane';
  return 'satellite';
}

/**
 * One flyer crosses the screen every 45 s, taking 8 s, left to right, gliding smoothly.
 * Returns its left edge, or null when it is off stage.
 */
export const FLYER_CYCLE_MS = 45000;
export const FLYER_CROSS_MS = 8000;
export function flyerX(now: number, W: number, spriteW: number, reduced: boolean): number | null {
  if (reduced) return null;
  const t = now % FLYER_CYCLE_MS;
  if (t >= FLYER_CROSS_MS) return null;
  return -spriteW + ((W + 2 * spriteW) * t) / FLYER_CROSS_MS;
}
