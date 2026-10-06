/**
 * Early RQ (owner decision 2026-10-05): until today has COLD_START_MIN_PLAYS finished plays,
 * the percentile blends today's real players with a baseline, so early players still get an
 * RQ, labelled as an estimate. From 30 players on, it is the plain §4.7 percentile.
 *
 * Baseline: finished scores from recent days (real players, other riddles), or a fixed normal
 * curve when there are too few of those. Nothing here is ever stored or shown as a player.
 */
import { COLD_START_MIN_PLAYS, percentile } from './scoring';

/** Days of past scores used as the baseline. */
export const BASELINE_DAYS = 14;
/** At most this many recent past scores are read (keeps the query small on busy days). */
export const BASELINE_MAX_SCORES = 2000;
/** Fallback curve when the past days hold fewer than COLD_START_MIN_PLAYS scores (0–450 scale). */
export const FALLBACK_MEAN = 180;
export const FALLBACK_SD = 80;

/** Standard normal CDF (Abramowitz–Stegun 7.1.26 via erf, |error| < 1.5e-7). */
export function normCdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

/** Percentile (0–100) of `score` against the baseline. */
export function baselinePercentile(score: number, pastScores: number[]): number {
  if (pastScores.length >= COLD_START_MIN_PLAYS) return percentile(score, pastScores);
  return normCdf((score - FALLBACK_MEAN) / FALLBACK_SD) * 100;
}

/**
 * Percentile of `score` among today's finished `scores` (including this one), blended with the
 * baseline while there are fewer than COLD_START_MIN_PLAYS of them:
 *   P = (n · P_today + (30 − n) · P_baseline) / 30
 */
export function blendedPercentile(score: number, scores: number[], pastScores: number[]): { percentile: number; estimated: boolean } {
  const n = scores.length;
  const m = COLD_START_MIN_PLAYS;
  if (n >= m) return { percentile: percentile(score, scores), estimated: false };
  const today = n ? percentile(score, scores) : 0;
  return { percentile: (n * today + (m - n) * baselinePercentile(score, pastScores)) / m, estimated: true };
}
