'use client';
/**
 * Results prefetched by the climb right after the last answer, so the results page
 * paints instantly. Only ever filled once the play is finished (§7.7), used once, and
 * only while fresh: the percentile is live and re-fetched on any later visit (§4.7).
 */
import { api } from './client';
import type { ResultsPayload } from './types';

const FRESH_MS = 60_000;
let pending: { at: number; p: Promise<ResultsPayload>; value?: ResultsPayload } | null = null;

export function prefetchResults() {
  const p = api<ResultsPayload>('/api/results');
  const entry: NonNullable<typeof pending> = { at: Date.now(), p };
  p.then(
    (v) => {
      entry.value = v;
    },
    () => {
      /* the results page fetches again */
    },
  );
  pending = entry;
}

const fresh = () => (pending && Date.now() - pending.at < FRESH_MS ? pending : null);

/** Resolves once the prefetch lands (or fails), so the climb can hand off to a drawn results page. */
export function resultsSettled(): Promise<void> {
  const hit = fresh();
  return hit ? hit.p.then(() => undefined, () => undefined) : Promise.resolve();
}

/** The prefetched results if they've already arrived and are fresh. Doesn't consume them. */
export function peekResults(): ResultsPayload | null {
  return fresh()?.value ?? null;
}

/** The prefetched results if fresh (consumed), otherwise a new request. */
export function takeResults(): Promise<ResultsPayload> {
  const hit = fresh()?.p ?? null;
  pending = null;
  return hit ? hit.catch(() => api<ResultsPayload>('/api/results')) : api<ResultsPayload>('/api/results');
}

/** Drop the prefetch (it has been shown). */
export function clearResults() {
  pending = null;
}
