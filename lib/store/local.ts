/**
 * Local JSON-file store for development, unit tests, and Playwright.
 * Single-process only: every write rewrites the file atomically. Not for production.
 * Pass path ':memory:' to keep everything in memory.
 */
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Store, CrowdAnswerRow } from '../db';
import type { Answer, AnswerEmbedding, DailySet, Play, Riddle, VerdictReport, WordVerdictRow } from '../types';

interface Data {
  riddles: Record<string, Riddle>;
  daily_sets: Record<string, DailySet>;
  plays: Play[];
  answers: Answer[];
  word_verdicts: WordVerdictRow[];
  answer_embeddings: AnswerEmbedding[];
  verdict_reports: (VerdictReport & { id: string; created_at: string })[];
}

const empty = (): Data => ({ riddles: {}, daily_sets: {}, plays: [], answers: [], word_verdicts: [], answer_embeddings: [], verdict_reports: [] });
const clone = <T>(v: T): T => (v === null || v === undefined ? v : JSON.parse(JSON.stringify(v)));

export class LocalStore implements Store {
  readonly kind = 'local' as const;
  private data: Data | null = null;
  private mtime = 0;

  constructor(private file: string) {}

  private load(): Data {
    if (this.file === ':memory:') return (this.data ??= empty());
    const abs = path.resolve(this.file);
    try {
      const st = fs.statSync(abs);
      // Reload if another process (e.g. `npm run seed`) rewrote the file.
      if (!this.data || st.mtimeMs !== this.mtime) {
        this.data = { ...empty(), ...JSON.parse(fs.readFileSync(abs, 'utf8')) };
        this.mtime = st.mtimeMs;
      }
    } catch {
      this.data ??= empty();
    }
    return this.data!;
  }

  private save() {
    if (this.file === ':memory:') return;
    const abs = path.resolve(this.file);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    const json = JSON.stringify(this.data);
    const tmp = `${abs}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, json);
    // Windows (and OneDrive) can briefly lock the target; retry, then fall back to a direct write.
    let renamed = false;
    for (let i = 0; i < 5 && !renamed; i++) {
      try {
        fs.renameSync(tmp, abs);
        renamed = true;
      } catch {
        const until = Date.now() + 20;
        while (Date.now() < until) {
          /* brief spin */
        }
      }
    }
    if (!renamed) {
      fs.writeFileSync(abs, json);
      fs.rmSync(tmp, { force: true });
    }
    this.mtime = fs.statSync(abs).mtimeMs;
  }

  async getRiddle(id: string) {
    return clone(this.load().riddles[id] ?? null);
  }
  async countRiddles() {
    return Object.keys(this.load().riddles).length;
  }
  async upsertRiddles(riddles: Riddle[]) {
    const d = this.load();
    for (const r of riddles) d.riddles[r.id] = clone(r);
    this.save();
  }

  async getDailySet(date: string) {
    return clone(this.load().daily_sets[date] ?? null);
  }
  async listDailySets() {
    return clone(Object.values(this.load().daily_sets)).sort((a, b) => a.puzzle_date.localeCompare(b.puzzle_date));
  }
  async upsertDailySets(sets: DailySet[]) {
    const d = this.load();
    for (const s of sets) {
      for (const [k, v] of Object.entries(d.daily_sets)) if (v.puzzle_number === s.puzzle_number && k !== s.puzzle_date) delete d.daily_sets[k];
      d.daily_sets[s.puzzle_date] = clone(s);
    }
    this.save();
  }

  async getPlay(deviceId: string, date: string) {
    return clone(this.load().plays.find((p) => p.device_id === deviceId && p.puzzle_date === date) ?? null);
  }
  async createPlay(deviceId: string, date: string) {
    const existing = await this.getPlay(deviceId, date);
    if (existing) return existing;
    const p: Play = { id: randomUUID(), device_id: deviceId, puzzle_date: date, started_at: new Date().toISOString(), finished_at: null, total_score: null, final_percentile: null, final_rq: null };
    this.load().plays.push(p);
    this.save();
    return clone(p);
  }
  async updatePlay(id: string, patch: Partial<Play>) {
    const p = this.load().plays.find((x) => x.id === id);
    if (!p) return;
    Object.assign(p, clone(patch));
    this.save();
  }
  async listPlays(deviceId: string) {
    return clone(this.load().plays.filter((p) => p.device_id === deviceId)).sort((a, b) => a.puzzle_date.localeCompare(b.puzzle_date));
  }
  async finishedScores(date: string) {
    return this.load().plays.filter((p) => p.puzzle_date === date && p.finished_at && p.total_score !== null).map((p) => p.total_score!);
  }
  async recentFinishedScores(fromDate: string, beforeDate: string, limit: number) {
    return this.load()
      .plays.filter((p) => p.puzzle_date >= fromDate && p.puzzle_date < beforeDate && p.finished_at && p.total_score !== null)
      .sort((a, b) => b.puzzle_date.localeCompare(a.puzzle_date))
      .slice(0, limit)
      .map((p) => p.total_score!);
  }

  async getAnswers(playId: string) {
    return clone(this.load().answers.filter((a) => a.play_id === playId)).sort((a, b) => a.slot - b.slot);
  }
  async serveAnswer(row: Answer) {
    const d = this.load();
    const existing = d.answers.find((a) => a.play_id === row.play_id && a.slot === row.slot);
    if (existing) return clone(existing);
    d.answers.push(clone(row));
    this.save();
    return clone(row);
  }
  async completeAnswer(playId: string, slot: number, patch: Partial<Answer>) {
    const a = this.load().answers.find((x) => x.play_id === playId && x.slot === slot);
    if (!a) throw new Error('answer row missing');
    if (!a.answered_at) {
      Object.assign(a, clone(patch));
      this.save();
    }
    return clone(a);
  }
  async crowdAnswers(riddleId: string, date: string): Promise<CrowdAnswerRow[]> {
    const d = this.load();
    const playIds = new Set(d.plays.filter((p) => p.puzzle_date === date).map((p) => p.id));
    return d.answers
      .filter((a) => a.riddle_id === riddleId && a.answered_at && playIds.has(a.play_id))
      .map((a) => ({ parsed_value: a.parsed_value, normalized_input: a.normalized_input, verdict: a.verdict, trapped: a.trapped }));
  }
  async deviceAnswers(deviceId: string) {
    const d = this.load();
    const plays = new Map(d.plays.filter((p) => p.device_id === deviceId).map((p) => [p.id, p.puzzle_date]));
    return clone(d.answers.filter((a) => plays.has(a.play_id)).map((a) => ({ ...a, puzzle_date: plays.get(a.play_id)! })));
  }

  async getWordVerdict(riddleId: string, normalizedInput: string) {
    return clone(this.load().word_verdicts.find((v) => v.riddle_id === riddleId && v.normalized_input === normalizedInput) ?? null);
  }
  async putWordVerdict(row: WordVerdictRow) {
    const existing = await this.getWordVerdict(row.riddle_id, row.normalized_input);
    if (existing) return existing;
    const r = { ...row, created_at: new Date().toISOString() };
    this.load().word_verdicts.push(r);
    this.save();
    return clone(r);
  }

  async getAnswerEmbeddings(riddleId: string) {
    return clone(this.load().answer_embeddings.filter((e) => e.riddle_id === riddleId));
  }
  async replaceAnswerEmbeddings(riddleId: string, rows: AnswerEmbedding[]) {
    const d = this.load();
    d.answer_embeddings = d.answer_embeddings.filter((e) => e.riddle_id !== riddleId).concat(clone(rows));
    this.save();
  }

  async insertReport(r: VerdictReport) {
    this.load().verdict_reports.push({ ...r, id: randomUUID(), created_at: new Date().toISOString() });
    this.save();
  }
  async hasReport(riddleId: string, deviceId: string) {
    return this.load().verdict_reports.some((r) => r.riddle_id === riddleId && r.device_id === deviceId);
  }
}
