/**
 * Results percentile and score curve (owner decisions 2026-10-05 and 2026-10-09).
 *
 * Until today has COLD_START_MIN_PLAYS finished plays, the percentile and the curve blend
 * today's real players with a baseline, labelled as an early estimate. From 30 players on,
 * they come from today's players alone.
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
/** The results curve: score axis 0–SCORE_MAX in CURVE_COLUMNS columns of 10 points. */
export const SCORE_MAX = 450;
export const CURVE_COLUMNS = 45;

/** Standard normal CDF (Abramowitz–Stegun 7.1.26 via erf, |error| < 1.5e-7). */
export function normCdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

const normPdf = (z: number) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);

/** Percentile (0–100) of `score` against the baseline. */
export function baselinePercentile(score: number, pastScores: number[]): number {
  if (pastScores.length >= COLD_START_MIN_PLAYS) return percentile(score, pastScores);
  return normCdf((score - FALLBACK_MEAN) / FALLBACK_SD) * 100;
}

/** Weight of today's players in the blend: n/30 below 30 players, then 1. */
export function todayWeight(n: number): number {
  return Math.min(1, n / COLD_START_MIN_PLAYS);
}

/**
 * Percentile of `score` among today's finished `scores` (including this one), blended with the
 * baseline while there are fewer than COLD_START_MIN_PLAYS of them:
 *   P = (n · P_today + (30 − n) · P_baseline) / 30
 */
export function blendedPercentile(score: number, scores: number[], pastScores: number[]): { percentile: number; estimated: boolean } {
  const n = scores.length;
  if (n >= COLD_START_MIN_PLAYS) return { percentile: percentile(score, scores), estimated: false };
  const w = todayWeight(n);
  const today = n ? percentile(score, scores) : 0;
  return { percentile: w * today + (1 - w) * baselinePercentile(score, pastScores), estimated: true };
}

/** Smoothed density of `scores` at each column centre (Gaussian kernel, Silverman bandwidth, at least 15 points). */
function kde(scores: number[], centres: number[]): number[] {
  const n = scores.length;
  const mean = scores.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(scores.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  const h = Math.max(15, 1.06 * sd * n ** -0.2);
  return centres.map((c) => scores.reduce((a, s) => a + normPdf((c - s) / h), 0) / (n * h));
}

/**
 * The results curve: how scores spread over 0–450, as CURVE_COLUMNS heights scaled so the
 * tallest is 1. Today's players blended with the baseline exactly like the percentile.
 */
export function scoreCurve(scores: number[], pastScores: number[]): number[] {
  const centres = Array.from({ length: CURVE_COLUMNS }, (_, i) => ((i + 0.5) * SCORE_MAX) / CURVE_COLUMNS);
  const w = todayWeight(scores.length);
  const today = scores.length ? kde(scores, centres) : centres.map(() => 0);
  const base =
    w >= 1
      ? centres.map(() => 0)
      : pastScores.length >= COLD_START_MIN_PLAYS
        ? kde(pastScores, centres)
        : centres.map((c) => normPdf((c - FALLBACK_MEAN) / FALLBACK_SD) / FALLBACK_SD);
  const mix = centres.map((_, i) => w * today[i] + (1 - w) * base[i]);
  const peak = Math.max(...mix);
  return mix.map((v) => (peak > 0 ? Math.round((v / peak) * 1000) / 1000 : 0));
}

/** Curve column for a score. */
export function scoreColumn(score: number): number {
  return Math.min(CURVE_COLUMNS - 1, Math.max(0, Math.floor((score / SCORE_MAX) * CURVE_COLUMNS)));
}

/** "Top N%" from a percentile, never below 1. */
export function topPercent(percentileValue: number): number {
  return Math.max(1, 100 - Math.round(percentileValue));
}
