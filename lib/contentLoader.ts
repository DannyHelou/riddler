/**
 * Reads content/ from disk and turns it into rows for the store. Server and scripts only.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { AnswerEmbedding, DailySet, Riddle } from './types';
import type { Schedule } from './content';
import { validateRiddle, validateSchedule } from './content';
import { puzzleNumber, launchDate } from './dates';
import { normalizeWord } from './normalize';
import type { EmbedFn } from './embed';
import type { Store } from './db';

export function contentDir(): string {
  return path.resolve(process.env.BURNER_CONTENT_DIR || 'content');
}

export function loadContent(dir = contentDir()) {
  const riddleDir = path.join(dir, 'riddles');
  const riddles: { riddle: Riddle; fileId: string }[] = fs
    .readdirSync(riddleDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({ riddle: JSON.parse(fs.readFileSync(path.join(riddleDir, f), 'utf8')) as Riddle, fileId: f.replace(/\.json$/, '') }));
  const schedule = JSON.parse(fs.readFileSync(path.join(dir, 'schedule.json'), 'utf8')) as Schedule;
  const simDir = path.join(dir, 'sims');
  const simIds = new Set(
    fs.existsSync(simDir) ? fs.readdirSync(simDir).filter((f) => f.endsWith('.ts') && f !== 'run-all.ts').map((f) => f.replace(/\.ts$/, '')) : [],
  );
  return { riddles, schedule, simIds };
}

export function validateContent(c: ReturnType<typeof loadContent>) {
  const errors: string[] = [];
  const byId = new Map<string, Riddle>();
  for (const { riddle, fileId } of c.riddles) {
    for (const e of validateRiddle(riddle, { simIds: c.simIds, fileId })) errors.push(`${fileId}: ${e}`);
    if (byId.has(riddle.id)) errors.push(`${fileId}: duplicate id ${riddle.id}`);
    byId.set(riddle.id, riddle);
  }
  for (const e of validateSchedule(c.schedule, byId)) errors.push(`schedule.json: ${e}`);
  return { errors, byId };
}

export function scheduleToSets(schedule: Schedule, launch = launchDate()): DailySet[] {
  return Object.entries(schedule)
    .filter(([d]) => !d.startsWith('_'))
    .map(([date, s]) => ({ puzzle_date: date, puzzle_number: puzzleNumber(date, launch), warmup_id: s.warmup, trap_id: s.trap, boss_id: s.boss }));
}

export async function computeEmbeddings(riddle: Riddle, embed: EmbedFn): Promise<AnswerEmbedding[]> {
  if (riddle.answer_type !== 'word') return [];
  const acc = riddle.accepted_answers ?? [];
  const trap = riddle.trap_answers ?? [];
  const vecs = await embed([...acc, ...trap].map(normalizeWord));
  return [
    ...acc.map((text, i) => ({ riddle_id: riddle.id, kind: 'accepted' as const, text, embedding: vecs[i] })),
    ...trap.map((text, i) => ({ riddle_id: riddle.id, kind: 'trap' as const, text, embedding: vecs[acc.length + i] })),
  ];
}

/** Validate and load content/ into a store. Throws with every problem listed if content is invalid. */
export async function seedStore(store: Store, embed: EmbedFn, log: (s: string) => void = () => {}) {
  const content = loadContent();
  const { errors, byId } = validateContent(content);
  if (errors.length) throw new Error(`Content is invalid:\n  ${errors.join('\n  ')}`);
  const riddles = [...byId.values()];
  await store.upsertRiddles(riddles);
  log(`Upserted ${riddles.length} riddles`);
  const sets = scheduleToSets(content.schedule);
  await store.upsertDailySets(sets);
  log(`Upserted ${sets.length} daily sets`);
  for (const r of riddles) {
    if (r.answer_type !== 'word') continue;
    const rows = await computeEmbeddings(r, embed);
    await store.replaceAnswerEmbeddings(r.id, rows);
    log(`Embedded ${rows.length} answers for ${r.id}`);
  }
  return { riddles: riddles.length, sets: sets.length };
}
