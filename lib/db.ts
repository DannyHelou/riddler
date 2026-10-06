/**
 * Data access. Server only.
 *
 * `Store` is the narrow set of queries the game needs. Two backends:
 *  - Supabase Postgres (production): used when NEXT_PUBLIC_SUPABASE_URL and
 *    SUPABASE_SERVICE_ROLE_KEY are set. Schema: supabase/migrations/0001_init.sql.
 *  - Local JSON file (development, tests, e2e): .data/burner.json.
 *
 * MVP computes percentiles and crowd stats from direct queries over today's rows.
 * TODO: past ~50k plays/day, maintain a per-day histogram table instead.
 */
import type { Answer, AnswerEmbedding, DailySet, Play, Riddle, VerdictReport, WordVerdictRow } from './types';
import { assertServer } from './secrets';

assertServer('lib/db');

export interface CrowdAnswerRow {
  parsed_value: number | null;
  normalized_input: string | null;
  verdict: Answer['verdict'];
  trapped: boolean;
}

export interface Store {
  readonly kind: 'supabase' | 'local';

  getRiddle(id: string): Promise<Riddle | null>;
  countRiddles(): Promise<number>;
  upsertRiddles(riddles: Riddle[]): Promise<void>;

  getDailySet(date: string): Promise<DailySet | null>;
  listDailySets(): Promise<DailySet[]>;
  upsertDailySets(sets: DailySet[]): Promise<void>;

  getPlay(deviceId: string, date: string): Promise<Play | null>;
  /** Idempotent: returns the existing play for (device, date) if there is one. */
  createPlay(deviceId: string, date: string): Promise<Play>;
  updatePlay(id: string, patch: Partial<Play>): Promise<void>;
  listPlays(deviceId: string): Promise<Play[]>;
  /** total_score of every finished play on `date`. */
  finishedScores(date: string): Promise<number[]>;
  /** total_score of finished plays with fromDate <= puzzle_date < beforeDate, newest days first, at most `limit`. */
  recentFinishedScores(fromDate: string, beforeDate: string, limit: number): Promise<number[]>;

  getAnswers(playId: string): Promise<Answer[]>;
  /** Idempotent: inserts the served row, or returns the existing one (keeps the original served_at). */
  serveAnswer(row: Answer): Promise<Answer>;
  /** Writes the answer only if the slot is still unanswered. Returns the stored row either way. */
  completeAnswer(playId: string, slot: number, patch: Partial<Answer>): Promise<Answer>;
  /** Answered rows for a riddle among plays on `date` (crowd stats, after finishing only). */
  crowdAnswers(riddleId: string, date: string): Promise<CrowdAnswerRow[]>;
  /** Answered rows for a device across all days (personal stats). */
  deviceAnswers(deviceId: string): Promise<(Answer & { puzzle_date: string })[]>;

  getWordVerdict(riddleId: string, normalizedInput: string): Promise<WordVerdictRow | null>;
  /** Insert-if-absent so the first cached verdict wins. */
  putWordVerdict(row: WordVerdictRow): Promise<WordVerdictRow>;

  getAnswerEmbeddings(riddleId: string): Promise<AnswerEmbedding[]>;
  replaceAnswerEmbeddings(riddleId: string, rows: AnswerEmbedding[]): Promise<void>;

  insertReport(r: VerdictReport): Promise<void>;
  hasReport(riddleId: string, deviceId: string): Promise<boolean>;
}

let cached: Store | null = null;

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function getStore(): Promise<Store> {
  if (cached) return cached;
  // Vercel's filesystem is read-only: without Supabase every request would fail with a vague 500.
  if (!supabaseConfigured() && process.env.NODE_ENV === 'production' && !process.env.BURNER_DATA_FILE) {
    throw new Error('Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  if (supabaseConfigured()) {
    const { SupabaseStore } = await import('./store/supabase');
    cached = new SupabaseStore(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  } else {
    const { LocalStore } = await import('./store/local');
    cached = new LocalStore(process.env.BURNER_DATA_FILE || '.data/burner.json');
  }
  return cached;
}

/** For tests. */
export function setStore(s: Store | null) {
  cached = s;
}
