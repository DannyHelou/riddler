/**
 * Supabase Postgres store (production). Uses the service role key, so it must
 * only ever be imported on the server.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Store, CrowdAnswerRow } from '../db';
import type { Answer, AnswerEmbedding, DailySet, Play, Riddle, VerdictReport, WordVerdictRow } from '../types';

function check<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
}

const PG_UNIQUE_VIOLATION = '23505';

/** pgvector comes back as "[0.1,0.2,...]". */
function parseVector(v: unknown): number[] {
  if (Array.isArray(v)) return v.map(Number);
  if (typeof v === 'string') return JSON.parse(v);
  return [];
}

export class SupabaseStore implements Store {
  readonly kind = 'supabase' as const;
  private db: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  async getRiddle(id: string) {
    return check(await this.db.from('riddles').select('*').eq('id', id).maybeSingle(), 'getRiddle') as Riddle | null;
  }
  async countRiddles() {
    const res = await this.db.from('riddles').select('id', { count: 'exact', head: true });
    if (res.error) throw new Error(res.error.message);
    return res.count ?? 0;
  }
  async upsertRiddles(riddles: Riddle[]) {
    const rows = riddles.map((r) => ({
      id: r.id, tier: r.tier, category: r.category, answer_type: r.answer_type, prompt_md: r.prompt_md, prompt_short: r.prompt_short ?? null,
      hint_md: r.hint_md, explain_intuition_md: r.explain_intuition_md, explain_math_md: r.explain_math_md, time_limit_s: r.time_limit_s,
      number_format: r.number_format ?? null, answer_value: r.answer_value ?? null, trap_value: r.trap_value ?? null,
      closeness_cap: r.closeness_cap ?? null, unit_label: r.unit_label ?? null, answer_display: r.answer_display,
      accepted_answers: r.accepted_answers ?? null, trap_answers: r.trap_answers ?? null, verified: r.verified, credit: r.credit ?? null,
    }));
    check(await this.db.from('riddles').upsert(rows), 'upsertRiddles');
  }

  async getDailySet(date: string) {
    return check(await this.db.from('daily_sets').select('*').eq('puzzle_date', date).maybeSingle(), 'getDailySet') as DailySet | null;
  }
  async listDailySets() {
    return check(await this.db.from('daily_sets').select('*').order('puzzle_date'), 'listDailySets') as DailySet[];
  }
  async upsertDailySets(sets: DailySet[]) {
    if (sets.length) check(await this.db.from('daily_sets').upsert(sets, { onConflict: 'puzzle_date' }), 'upsertDailySets');
  }

  async getPlay(deviceId: string, date: string) {
    return check(await this.db.from('plays').select('*').eq('device_id', deviceId).eq('puzzle_date', date).maybeSingle(), 'getPlay') as Play | null;
  }
  async createPlay(deviceId: string, date: string) {
    const res = await this.db.from('plays').insert({ device_id: deviceId, puzzle_date: date }).select('*').single();
    if (res.error) {
      if (res.error.code === PG_UNIQUE_VIOLATION) {
        const existing = await this.getPlay(deviceId, date);
        if (existing) return existing;
      }
      throw new Error(`createPlay: ${res.error.message}`);
    }
    return res.data as Play;
  }
  async updatePlay(id: string, patch: Partial<Play>) {
    check(await this.db.from('plays').update(patch).eq('id', id), 'updatePlay');
  }
  async listPlays(deviceId: string) {
    return check(await this.db.from('plays').select('*').eq('device_id', deviceId).order('puzzle_date'), 'listPlays') as Play[];
  }
  async finishedScores(date: string) {
    const out: number[] = [];
    const page = 1000;
    for (let from = 0; ; from += page) {
      const rows = check(
        await this.db.from('plays').select('total_score').eq('puzzle_date', date).not('finished_at', 'is', null).range(from, from + page - 1),
        'finishedScores',
      ) as { total_score: number | null }[];
      for (const r of rows) if (r.total_score !== null) out.push(r.total_score);
      if (rows.length < page) break;
    }
    return out;
  }

  async getAnswers(playId: string) {
    return check(await this.db.from('answers').select('*').eq('play_id', playId).order('slot'), 'getAnswers') as Answer[];
  }
  async serveAnswer(row: Answer) {
    const res = await this.db.from('answers').insert(row).select('*').single();
    if (res.error) {
      if (res.error.code === PG_UNIQUE_VIOLATION) {
        const existing = check(await this.db.from('answers').select('*').eq('play_id', row.play_id).eq('slot', row.slot).single(), 'serveAnswer');
        return existing as Answer;
      }
      throw new Error(`serveAnswer: ${res.error.message}`);
    }
    return res.data as Answer;
  }
  async completeAnswer(playId: string, slot: number, patch: Partial<Answer>) {
    // Conditional update makes answering idempotent under concurrent requests.
    check(await this.db.from('answers').update(patch).eq('play_id', playId).eq('slot', slot).is('answered_at', null), 'completeAnswer');
    return check(await this.db.from('answers').select('*').eq('play_id', playId).eq('slot', slot).single(), 'completeAnswer') as Answer;
  }
  async crowdAnswers(riddleId: string, date: string): Promise<CrowdAnswerRow[]> {
    const out: CrowdAnswerRow[] = [];
    const page = 1000;
    for (let from = 0; ; from += page) {
      const rows = check(
        await this.db
          .from('answers')
          .select('parsed_value, normalized_input, verdict, trapped, plays!inner(puzzle_date)')
          .eq('riddle_id', riddleId)
          .eq('plays.puzzle_date', date)
          .not('answered_at', 'is', null)
          .range(from, from + page - 1),
        'crowdAnswers',
      ) as unknown as CrowdAnswerRow[];
      for (const r of rows) out.push({ parsed_value: r.parsed_value, normalized_input: r.normalized_input, verdict: r.verdict, trapped: r.trapped });
      if (rows.length < page) break;
    }
    return out;
  }
  async deviceAnswers(deviceId: string) {
    const rows = check(
      await this.db.from('answers').select('*, plays!inner(device_id, puzzle_date)').eq('plays.device_id', deviceId),
      'deviceAnswers',
    ) as unknown as (Answer & { plays: { puzzle_date: string } })[];
    return rows.map(({ plays, ...a }) => ({ ...(a as Answer), puzzle_date: plays.puzzle_date }));
  }

  async getWordVerdict(riddleId: string, normalizedInput: string) {
    return check(
      await this.db.from('word_verdicts').select('*').eq('riddle_id', riddleId).eq('normalized_input', normalizedInput).maybeSingle(),
      'getWordVerdict',
    ) as WordVerdictRow | null;
  }
  async putWordVerdict(row: WordVerdictRow) {
    // ignoreDuplicates: the first cached verdict wins, so identical inputs always agree.
    check(await this.db.from('word_verdicts').upsert(row, { onConflict: 'riddle_id,normalized_input', ignoreDuplicates: true }), 'putWordVerdict');
    return (await this.getWordVerdict(row.riddle_id, row.normalized_input)) ?? row;
  }

  async getAnswerEmbeddings(riddleId: string) {
    const rows = check(await this.db.from('answer_embeddings').select('*').eq('riddle_id', riddleId), 'getAnswerEmbeddings') as (Omit<AnswerEmbedding, 'embedding'> & { embedding: unknown })[];
    return rows.map((r) => ({ ...r, embedding: parseVector(r.embedding) }));
  }
  async replaceAnswerEmbeddings(riddleId: string, rows: AnswerEmbedding[]) {
    check(await this.db.from('answer_embeddings').delete().eq('riddle_id', riddleId), 'replaceAnswerEmbeddings');
    if (rows.length) {
      check(
        await this.db.from('answer_embeddings').insert(rows.map((r) => ({ ...r, embedding: JSON.stringify(r.embedding) }))),
        'replaceAnswerEmbeddings',
      );
    }
  }

  async insertReport(r: VerdictReport) {
    check(await this.db.from('verdict_reports').insert(r), 'insertReport');
  }
  async hasReport(riddleId: string, deviceId: string) {
    const res = await this.db.from('verdict_reports').select('id', { count: 'exact', head: true }).eq('riddle_id', riddleId).eq('device_id', deviceId);
    return (res.count ?? 0) > 0;
  }
}
