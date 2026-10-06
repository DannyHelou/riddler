/** Shared domain types. Rows mirror the Postgres schema in supabase/migrations (§7.6). */

export type Tier = 'warmup' | 'trap' | 'boss';
export type AnswerType = 'number' | 'word';
export type NumberFormat = 'percent' | 'quantity';
export type WordVerdict = 'correct' | 'trapped' | 'wrong';
export type AnswerVerdict = WordVerdict | 'timeout';
export type JudgeSource = 'exact' | 'typo' | 'embedding' | 'llm' | 'cache' | 'none';

export const TIERS: Tier[] = ['warmup', 'trap', 'boss'];
export const TIER_TIME_LIMIT: Record<Tier, number> = { warmup: 30, trap: 60, boss: 120 };
export const TIER_NAME: Record<Tier, string> = { warmup: 'Warm-up', trap: 'The trap', boss: 'Boss' };
export const TIER_SHORT: Record<Tier, string> = { warmup: 'Warm-up', trap: 'Trap', boss: 'Boss' };
export const TIER_COLOR: Record<Tier, string> = { warmup: '#8FA3FF', trap: '#F0B45A', boss: '#B98CF0' };
export const TIER_EMOJI: Record<Tier, string> = { warmup: '🟢', trap: '🟡', boss: '🔴' };

export interface Riddle {
  id: string;
  tier: Tier;
  category: string;
  answer_type: AnswerType;
  prompt_md: string;
  /** Optional short form for the debrief; falls back to prompt_md. */
  prompt_short?: string | null;
  hint_md: string;
  explain_intuition_md: string;
  explain_math_md: string;
  time_limit_s: number;
  number_format?: NumberFormat | null;
  answer_value?: number | null;
  trap_value?: number | null;
  closeness_cap?: number | null;
  unit_label?: string | null;
  answer_display: string;
  accepted_answers?: string[] | null;
  trap_answers?: string[] | null;
  verified: boolean;
  credit?: string | null;
}

export interface DailySet {
  puzzle_date: string; // YYYY-MM-DD, America/Toronto
  puzzle_number: number;
  warmup_id: string;
  trap_id: string;
  boss_id: string;
}

export interface Play {
  id: string;
  device_id: string;
  puzzle_date: string;
  started_at: string;
  finished_at: string | null;
  total_score: number | null;
  final_percentile: number | null;
  final_rq: number | null;
}

export interface Answer {
  play_id: string;
  riddle_id: string;
  slot: 1 | 2 | 3;
  served_at: string;
  hint_used: boolean;
  raw_input: string | null;
  parsed_value: number | null;
  normalized_input: string | null;
  closeness: number | null;
  ladder_level: string | null;
  verdict: AnswerVerdict | null;
  trapped: boolean;
  judge_source: string | null;
  answered_at: string | null;
  points: number | null;
}

export interface WordVerdictRow {
  riddle_id: string;
  normalized_input: string;
  verdict: WordVerdict;
  source: string;
  sim_accepted: number | null;
  sim_trap: number | null;
  created_at?: string;
}

export interface AnswerEmbedding {
  riddle_id: string;
  kind: 'accepted' | 'trap';
  text: string;
  embedding: number[];
}

export interface VerdictReport {
  riddle_id: string;
  normalized_input: string;
  device_id: string;
}

/** Riddle as served to the browser before answering: no answer, trap, or lists (§7.7). */
export interface ServedRiddle {
  slot: 1 | 2 | 3;
  tier: Tier;
  promptMd: string;
  answerType: AnswerType;
  numberFormat: NumberFormat | null;
  unitLabel: string | null;
  timeLimitS: number;
  servedAt: string;
  serverNow: string;
}

export interface AnswerResult {
  slot: 1 | 2 | 3;
  points: number;
  closeness: number;
  trapped: boolean;
  answerDisplay: string;
  altitudeGain: number;
  altitudeTotal: number;
  timedOut: boolean;
  timeBonus: number;
  yourAnswer: string;
  // number
  parsedValue?: number | null;
  ladderLevel?: string | null;
  // word
  verdict?: AnswerVerdict | null;
  acceptedAs?: string | null;
  finished: boolean;
}

export type PlayStatus = 'not_started' | 'in_progress' | 'finished';

export interface TodayState {
  puzzleNumber: number;
  puzzleDate: string;
  nextResetAt: string;
  status: PlayStatus;
  currentSlot: 1 | 2 | 3 | null;
  /** Your own progress only (never crowd data): closeness and height gained per answered slot. */
  progress: { slot: number; closeness: number; altitudeGain: number }[];
  altitude: number;
  streak: number;
  deviceId: string;
}

export interface DebriefEntry {
  slot: 1 | 2 | 3;
  tier: Tier;
  answerType: AnswerType;
  numberFormat: NumberFormat | null;
  promptShort: string;
  yourAnswer: string;
  closeness: number;
  points: number;
  trapped: boolean;
  verdict: AnswerVerdict | null;
  ladderLevel: string | null;
  timeBonus: number;
  answerDisplay: string;
  explainIntuitionMd: string;
  explainMathMd: string;
  trapRate: number | null;
  crowd: CrowdHistogram | null;
  topAnswers: { text: string; share: number; isCorrect: boolean; isTrap: boolean; isYou: boolean }[] | null;
  canReport: boolean;
  reported: boolean;
}

export interface CrowdHistogram {
  counts: number[]; // 25 buckets
  answerBucket: number;
  trapBucket: number;
  youBucket: number | null;
  axis: { min: string; mid: string; max: string };
  scale: 'linear' | 'log';
}

export interface ResultsPayload {
  puzzleNumber: number;
  puzzleDate: string;
  nextResetAt: string;
  totalScore: number;
  maxScore: number;
  altitude: number;
  percentile: number;
  rq: number;
  /** True while today has fewer than 30 finished plays: the RQ blends in a baseline (lib/earlyRq.ts). */
  rqEstimated: boolean;
  n: number;
  coldStart: boolean;
  histogram: number[] | null;
  perRiddle: {
    slot: number;
    tier: Tier;
    answerType: AnswerType;
    ladderLevel: string | null;
    verdict: AnswerVerdict | null;
    trapped: boolean;
    timeBonus: number;
    points: number;
    closeness: number;
  }[];
  shareText: string;
  debrief: DebriefEntry[];
}

export interface StatsPayload {
  gamesPlayed: number;
  currentStreak: number;
  maxStreak: number;
  trapResistance: number | null;
  averageRq: number | null;
  bestLevel: string | null;
  lastRqs: { puzzleDate: string; rq: number | null }[];
}
