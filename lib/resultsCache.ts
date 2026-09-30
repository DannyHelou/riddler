'use client';
/**
 * Results prefetched by the climb right after the last answer, so the results page
 * paints instantly. Only ever filled once the play is finished (§7.7), used once, and
 * only while fresh: percentile and RQ are live and re-fetched on any later visit (§4.7).
 */
import { api } from './client';
import type { ResultsPayload } from './types';

const FRESH_MS = 60_000;
let pending: { at: number; p: Promise<ResultsPayload> } | null = null;

export function prefetchResults() {
  const p = api<ResultsPayload>('/api/results');
  p.catch(() => {
    /* the results page fetches again */
  });
  pending = { at: Date.now(), p };
}

/** The prefetched results if fresh (consumed), otherwise a new request. */
export function takeResults(): Promise<ResultsPayload> {
  const hit = pending && Date.now() - pending.at < FRESH_MS ? pending.p : null;
  pending = null;
  return hit ? hit.catch(() => api<ResultsPayload>('/api/results')) : api<ResultsPayload>('/api/results');
}
