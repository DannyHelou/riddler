/**
 * Burner reaction and camera: reference implementation of design brief §5.3–5.4.
 *
 * Every function is pure: give it closeness c in [0, 1] and a time, get a value
 * to draw. Times are in milliseconds.
 *
 * Two clocks:
 *   - `sinceFire`: ms since the player pressed "Fire the burner" (camera pan).
 *   - `t` (boost time): ms since the boost started = sinceFire - BOOST_START_MS.
 */

import { level, type Level } from './scoring';

export const PAN_MS = 650;
export const BOOST_START_MS = 750; // PAN_MS + 100 ms settle
export const BOOST_TOTAL_MS = 2600; // flame, flash, shake and climb all finish inside this
export const SEQUENCE_MS = BOOST_START_MS + BOOST_TOTAL_MS; // then the result card appears

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

/* ---------- Camera (§5.3) ---------- */

/** 0 = Question shot, 1 = Balloon shot. Use while panning down after "Fire the burner". */
export function panDownProgress(sinceFire: number): number {
  return easeInOutCubic(clamp01(sinceFire / PAN_MS));
}

/** 1 = Balloon shot, 0 = Question shot. Use while panning up after "Next riddle". */
export function panUpProgress(sinceNext: number): number {
  return 1 - easeInOutCubic(clamp01(sinceNext / PAN_MS));
}

/**
 * Vertical camera offset applied to the whole scene, given pan progress k
 * (0 = Question shot, 1 = Balloon shot) and the camera travel for this screen size.
 * Travel = H/2 - (signTop + signHeight/2), measured in the Balloon shot.
 */
export function cameraOffsetY(k: number, travel: number): number {
  return Math.round(travel * (1 - k));
}

/** Sign opacity follows the camera: fully visible in the Question shot, gone in the Balloon shot. */
export function signOpacity(k: number): number {
  return 1 - k;
}

/* ---------- Flame (§5.4.1) ---------- */

export function flamePeak(c: number): number {
  return 0.15 + 0.85 * c;
}

export function burnEndMs(c: number): number {
  return 300 + 1200 * c;
}

/** Flame intensity I in [0, 1] at boost time t. 0 before the boost (draw the pilot light). */
export function flameIntensity(c: number, t: number): number {
  if (t < 0) return 0;
  const peak = flamePeak(c);
  const end = burnEndMs(c);
  if (t < 150) return (t / 150) * peak;
  if (t < end) return peak;
  return Math.max(0, peak * (1 - (t - end) / 400));
}

/** Flame height in sprite pixels (1 = pilot light). */
export function flameHeight(intensity: number): number {
  return Math.round(1 + 10 * intensity);
}

export const PILOT_COLOR = '#6FB7FF';
export const BLUE_CORE = '#9FE8FF';

/**
 * Flame pixels for the 16×16 balloon sprite grid (x, y in sprite pixels).
 * Burner mouth is at row 13; the flame rises into the envelope.
 */
export function flamePixels(c: number, t: number): { x: number; y: number; color: string }[] {
  const I = flameIntensity(c, t);
  const h = flameHeight(I);
  const flicker = Math.floor(Math.max(0, t) / 70) % 2;
  const core = c >= 0.97 ? BLUE_CORE : '#FFFFFF';
  const out: { x: number; y: number; color: string }[] = [];
  for (let r = 0; r < h; r++) {
    const f = h > 1 ? r / (h - 1) : 0;
    const y = 13 - r;
    const cols = I < 0.05 ? [7, 8] : f < 0.4 ? [6, 7, 8, 9] : f < 0.75 ? [7, 8] : [flicker ? 8 : 7];
    for (const x of cols) {
      const color =
        I < 0.05 ? PILOT_COLOR
        : f < 0.3 ? (x === 7 || x === 8 ? core : '#FFE45C')
        : f < 0.6 ? '#FFE45C'
        : f < 0.85 ? '#F28C28'
        : '#FF5A4E';
      out.push({ x, y, color });
    }
  }
  return out;
}

/* ---------- Color flash (§5.4.2) ---------- */

/**
 * One color per closeness level (§4.5), heating up from grey (way off) through blue, violet,
 * magenta and orange to red (spot on). Changed from the hue ramp (hsl 0 → 130) at the owner's
 * request, 2026-09-28; spread into distinct hues (was grey → rose → red) on 2026-09-29.
 */
export const LEVEL_COLOR: Record<Level, string> = {
  Goldfish: '#6A6F86',
  Guesser: '#4F86E0',
  Analyst: '#9A6CF2',
  Quant: '#E05CC8',
  Genius: '#FF8040',
  Oracle: '#FF3448',
};

export function levelColor(c: number): string {
  return LEVEL_COLOR[level(clamp01(c))];
}

export function flashColor(c: number): string {
  return levelColor(c);
}

export function resultColor(c: number): string {
  return levelColor(c);
}

/** Full-screen flash opacity at boost time t: peaks at 0.38 at t = 300, gone by t = 1200. */
export function flashOpacity(t: number): number {
  if (t <= 300) return 0;
  return 0.38 * clamp01(1 - (t - 300) / 900);
}

/* ---------- Climb (§5.4.3) ---------- */

/** 0 → 1 progress of the altitude tween (t = 300 … 2100, ease-out cubic). */
export function climbProgress(t: number): number {
  return easeOutCubic(clamp01((t - 300) / 1800));
}

/** Downward balloon dip in px for way-off answers (c < 0.2). */
export function dipPx(c: number, t: number): number {
  if (c >= 0.2) return 0;
  return Math.round(14 * Math.sin(Math.PI * clamp01((t - 250) / 700)));
}

/** World y (px above sea level) for an altitude in metres: square-root scale (§4.9). */
export function worldY(altitudeM: number): number {
  return 12 * Math.sqrt(Math.max(0, altitudeM));
}

/* ---------- Screen shake (§5.4.4) ---------- */

export function shakeExtremeness(c: number): number {
  return Math.abs(2 * c - 1);
}

export function shakeAmplitudePx(c: number): number {
  const e = shakeExtremeness(c);
  return 18 * e * e;
}

export function shakeDurationMs(c: number): number {
  return 300 + 500 * shakeExtremeness(c);
}

/**
 * Scene offset at boost time t. Zero outside the shake window. Unrounded, so the shake is
 * smooth (it snapped to 2 px until 2026-09-29; changed at the owner's request).
 */
export function shakeOffset(c: number, t: number, reducedMotion = false): { x: number; y: number } {
  const D = shakeDurationMs(c);
  if (reducedMotion || t <= 300 || t >= 300 + D) return { x: 0, y: 0 };
  const amp = shakeAmplitudePx(c) * Math.pow(1 - (t - 300) / D, 2);
  return { x: amp * Math.sin(t / 11) || 0, y: amp * Math.cos(t / 17) || 0 };
}

/* ---------- Extras (§5.4.5) ---------- */

export function hasSparks(c: number): boolean {
  return c >= 0.8;
}

export function hasSmoke(c: number): boolean {
  return c < 0.2;
}
