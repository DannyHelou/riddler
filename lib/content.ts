/**
 * Content validation for scripts/seed.ts (§8.3). Pure: callers pass in the
 * riddles, the schedule, and the ids that have a Monte Carlo sim.
 */
import katex from 'katex';
import { closeness, level } from './scoring';
import { normalizeWord } from './normalize';
import { daysBetween } from './dates';
import type { Riddle, Tier } from './types';
import { TIERS, TIER_TIME_LIMIT } from './types';

export type Schedule = Record<string, { warmup: string; trap: string; boss: string }>;

/** A riddle may come back only after this many days (owner decision 2026-10-03; was 180). */
export const REPEAT_GAP_DAYS = 90;

const REQUIRED_STRINGS = ['id', 'tier', 'category', 'answer_type', 'prompt_md', 'hint_md', 'explain_intuition_md', 'explain_math_md', 'answer_display'] as const;

/** Every $…$ and $$…$$ segment in a Markdown string. */
export function mathSegments(md: string): { tex: string; display: boolean }[] {
  const out: { tex: string; display: boolean }[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) out.push(m[1] !== undefined ? { tex: m[1], display: true } : { tex: m[2], display: false });
  return out;
}

export function katexErrors(md: string): string[] {
  const errs: string[] = [];
  for (const seg of mathSegments(md)) {
    try {
      katex.renderToString(seg.tex, { displayMode: seg.display, throwOnError: true, strict: 'ignore' });
    } catch (e) {
      errs.push((e as Error).message);
    }
  }
  return errs;
}

export function validateRiddle(r: Riddle, opts: { simIds?: Set<string>; fileId?: string } = {}): string[] {
  const errs: string[] = [];
  const raw = r as unknown as Record<string, unknown>;
  for (const k of REQUIRED_STRINGS) {
    if (typeof raw[k] !== 'string' || !(raw[k] as string).trim()) errs.push(`missing ${k}`);
  }
  if (opts.fileId && r.id !== opts.fileId) errs.push(`id "${r.id}" does not match file name "${opts.fileId}"`);
  if (!TIERS.includes(r.tier)) errs.push(`unknown tier "${r.tier}"`);
  else if (r.time_limit_s !== TIER_TIME_LIMIT[r.tier]) errs.push(`tier ${r.tier} needs time_limit_s ${TIER_TIME_LIMIT[r.tier]}, got ${r.time_limit_s}`);
  if (typeof r.verified !== 'boolean') errs.push('missing verified');

  if (r.answer_type === 'number') {
    const fmtOk = r.number_format === 'percent' || r.number_format === 'quantity';
    if (!fmtOk) errs.push('number riddle needs number_format percent or quantity');
    for (const k of ['answer_value', 'trap_value', 'closeness_cap'] as const) {
      if (typeof r[k] !== 'number' || !Number.isFinite(r[k])) errs.push(`number riddle needs ${k}`);
    }
    if (typeof r.closeness_cap === 'number' && r.closeness_cap <= 0) errs.push('closeness_cap must be > 0');
    if (r.number_format === 'quantity') {
      if (!((r.answer_value ?? 0) > 0)) errs.push('quantity answer_value must be > 0');
      if (!((r.trap_value ?? 0) > 0)) errs.push('quantity trap_value must be > 0');
    }
    if (r.number_format === 'percent') {
      for (const k of ['answer_value', 'trap_value'] as const) {
        const v = r[k];
        if (typeof v === 'number' && (v < 0 || v > 100)) errs.push(`percent ${k} must be 0-100`);
      }
    }
    if (fmtOk && typeof r.answer_value === 'number' && typeof r.trap_value === 'number' && typeof r.closeness_cap === 'number' && r.closeness_cap > 0) {
      const cTrap = closeness(r.number_format!, r.trap_value, r.answer_value, r.closeness_cap);
      if (!(cTrap < 0.8)) errs.push(`trap is too close to the answer: c(trap) = ${cTrap.toFixed(3)} would score ${level(cTrap)}; needs < 0.8`);
    }
  } else if (r.answer_type === 'word') {
    const acc = r.accepted_answers ?? [];
    const trap = r.trap_answers ?? [];
    if (!Array.isArray(acc) || acc.length < 1) errs.push('word riddle needs at least 1 accepted answer');
    if (!Array.isArray(trap) || trap.length < 1) errs.push('word riddle needs at least 1 trap answer');
    const accN = new Set(acc.map(normalizeWord));
    for (const t of trap) if (accN.has(normalizeWord(t))) errs.push(`"${t}" is both accepted and a trap after normalization`);
    for (const a of [...acc, ...trap]) if (!normalizeWord(a)) errs.push(`answer "${a}" is empty after normalization`);
  } else {
    errs.push(`unknown answer_type "${String(raw.answer_type)}"`);
  }

  if (r.category === 'probability') {
    if (opts.simIds && !opts.simIds.has(r.id)) errs.push(`probability riddle needs content/sims/${r.id}.ts`);
    if (r.verified !== true) errs.push('probability riddle must be verified: true');
  }

  for (const k of ['prompt_md', 'hint_md', 'explain_intuition_md', 'explain_math_md'] as const) {
    if (typeof r[k] === 'string') for (const e of katexErrors(r[k])) errs.push(`${k}: KaTeX error: ${e}`);
  }
  return errs;
}

export function validateSchedule(schedule: Schedule, riddles: Map<string, Riddle>): string[] {
  const errs: string[] = [];
  const lastUsed = new Map<string, string>();
  const dates = Object.keys(schedule).filter((d) => !d.startsWith('_')).sort();
  for (const date of dates) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errs.push(`bad date key "${date}"`);
      continue;
    }
    const day = schedule[date];
    for (const tier of TIERS) {
      const id = day?.[tier as Tier];
      if (!id) {
        errs.push(`${date}: missing ${tier}`);
        continue;
      }
      const r = riddles.get(id);
      if (!r) {
        errs.push(`${date}: unknown riddle "${id}"`);
        continue;
      }
      if (r.tier !== tier) errs.push(`${date}: "${id}" is a ${r.tier} riddle in the ${tier} slot`);
      if (tier === 'trap' && r.answer_type !== 'number') errs.push(`${date}: the trap slot must be a number riddle ("${id}" is ${r.answer_type})`);
      const prev = lastUsed.get(id);
      if (prev && daysBetween(prev, date) < REPEAT_GAP_DAYS) errs.push(`${date}: "${id}" repeats within ${REPEAT_GAP_DAYS} days (last used ${prev})`);
      lastUsed.set(id, date);
    }
  }
  return errs;
}
