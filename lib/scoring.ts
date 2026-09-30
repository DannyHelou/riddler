/**
 * Riddler scoring: reference implementation of design brief §4.
 *
 * Pure functions, no I/O. The server is the only place these run for real
 * scoring (the client may import them for previews only).
 */

export type NumberFormat = 'percent' | 'quantity';
export type Verdict = 'correct' | 'trapped' | 'wrong' | 'timeout';

export const LEVELS = ['Goldfish', 'Guesser', 'Analyst', 'Quant', 'Genius', 'Oracle'] as const;
export type Level = (typeof LEVELS)[number];

/** Metres of altitude gained per point (§4.9). */
export const ALTITUDE_PER_POINT = 250;

/** Minimum finished plays before percentile / RQ / crowd stats are shown (§4.7). */
export const COLD_START_MIN_PLAYS = 30;

/** Network grace added to the time limit when validating an answer (§4.4). */
export const TIME_GRACE_S = 1.5;

/**
 * Closeness c in [0, 1] for a number answer (§4.2).
 * percent: linear distance in percentage points, capped at `cap` (default 50).
 * quantity: log10 distance in orders of magnitude, capped at `cap` (default 2).
 */
export function closeness(format: NumberFormat, guess: number, answer: number, cap: number): number {
  if (!Number.isFinite(guess)) return 0;
  if (format === 'percent') {
    return 1 - Math.min(Math.abs(guess - answer), cap) / cap;
  }
  if (guess <= 0 || answer <= 0) return 0;
  return 1 - Math.min(Math.abs(Math.log10(guess / answer)), cap) / cap;
}

/** Closeness for a word answer (§4.3). */
export function wordCloseness(verdict: Verdict): number {
  return verdict === 'correct' ? 1 : 0;
}

/**
 * Trap detection for number answers (§4.6): the guess is near the trap
 * (closeness to trap >= 0.8) and nearer to it than to the truth.
 */
export function isTrapped(format: NumberFormat, guess: number, answer: number, trap: number, cap: number): boolean {
  const c = closeness(format, guess, answer, cap);
  const cTrap = closeness(format, guess, trap, cap);
  return cTrap >= 0.8 && cTrap > c;
}

/** Speed bonus, scaled by closeness so fast wild guesses earn nothing (§4.4). */
export function timeBonus(c: number, secondsTaken: number, limitSeconds: number): number {
  return Math.round(50 * c * Math.max(0, 1 - secondsTaken / limitSeconds));
}

/** Points for one riddle (§4.4). Timeout: pass c = 0. */
export function points(c: number, secondsTaken: number, limitSeconds: number, hintUsed: boolean): number {
  return Math.max(0, Math.round(100 * c) + timeBonus(c, secondsTaken, limitSeconds) - (hintUsed ? 25 : 0));
}

/** Level name for a closeness value (§4.5). Oracle is deliberately narrow. */
export function level(c: number): Level {
  if (c >= 0.97) return 'Oracle';
  return LEVELS[Math.min(4, Math.floor(c * 5))];
}

/** Altitude gained for a riddle's points (§4.9), in metres. */
export function altitudeGain(pts: number): number {
  return pts * ALTITUDE_PER_POINT;
}

/**
 * Mid-rank percentile of `score` among `scores` (all finished plays today,
 * including this one) (§4.7). Returns 0-100.
 */
export function percentile(score: number, scores: number[]): number {
  if (scores.length === 0) return 0;
  let below = 0;
  let equal = 0;
  for (const s of scores) {
    if (s < score) below++;
    else if (s === score) equal++;
  }
  return ((below + 0.5 * equal) / scores.length) * 100;
}

/** Inverse standard normal CDF (Acklam's rational approximation, |error| < 1.2e-9). */
export function invNormCdf(p: number): number {
  if (p <= 0 || p >= 1) throw new RangeError('p must be in (0, 1)');
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

/** Riddle Quotient from a percentile (§4.7). Never label this "IQ" in copy. */
export function rq(percentileValue: number): number {
  const p = Math.min(99.5, Math.max(0.5, percentileValue)) / 100;
  const value = Math.round(100 + 15 * invNormCdf(p));
  return Math.min(145, Math.max(70, value));
}
