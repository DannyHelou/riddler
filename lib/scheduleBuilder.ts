/**
 * Builds content/schedule.json (§8.3) from the riddle pool. Pure; scripts/build-schedule.ts does the I/O.
 *
 * Each tier is its own queue: every day takes the riddle in that tier that has rested longest
 * (never-used riddles first, in pool order). With a stable pool that is a plain rotation, so a
 * riddle comes back exactly once per pool length, and pools of slightly different sizes
 * (say 90, 91, 92) make every day's trio a new mix. Days before `keepBefore` are copied from
 * the existing schedule unchanged, so published days never move.
 */
import type { Riddle, Tier } from './types';
import { TIERS } from './types';
import type { Schedule } from './content';
import { REPEAT_GAP_DAYS } from './content';
import { addDays, daysBetween } from './dates';

export interface BuildOptions {
  start: string;
  days: number;
  /** The current schedule; ids it uses keep their order at the front of each pool. */
  existing?: Schedule;
  /** Days before this date are copied from `existing` as they are. */
  keepBefore?: string;
}

export interface BuildResult {
  schedule: Schedule;
  pools: Record<Tier, number>;
  /** Shortest gap between two uses of the same riddle, or null if nothing repeats. */
  minGap: number | null;
  /** Days whose (warmup, trap, boss) trio already appeared earlier. */
  repeatedTrios: number;
}

/** FNV-1a: a stable pseudo-random order that doesn't reshuffle when riddles are added. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function dates(schedule: Schedule | undefined): string[] {
  return Object.keys(schedule ?? {})
    .filter((d) => !d.startsWith('_'))
    .sort();
}

export function buildSchedule(riddles: Riddle[], opts: BuildOptions): BuildResult {
  const existing = opts.existing ?? {};
  const known = dates(existing);

  // Pool order: riddles already scheduled (by first use), then the rest in hash order.
  const firstUse = new Map<string, string>();
  for (const d of known) for (const t of TIERS) if (!firstUse.has(existing[d][t])) firstUse.set(existing[d][t], d);
  const pools = {} as Record<Tier, string[]>;
  for (const t of TIERS) {
    const eligible = riddles.filter((r) => r.tier === t && (t !== 'trap' || r.answer_type === 'number'));
    pools[t] = eligible
      .sort((a, b) => {
        const fa = firstUse.get(a.id);
        const fb = firstUse.get(b.id);
        if (fa && fb) return fa < fb ? -1 : fa > fb ? 1 : 0;
        if (fa || fb) return fa ? -1 : 1;
        return hash(a.id) - hash(b.id) || (a.id < b.id ? -1 : 1);
      })
      .map((r) => r.id);
  }

  const schedule: Schedule = {};
  const lastUsed = new Map<string, string>();
  let minGap: number | null = null;
  const use = (id: string, date: string) => {
    const prev = lastUsed.get(id);
    if (prev) {
      const gap = daysBetween(prev, date);
      minGap = minGap === null ? gap : Math.min(minGap, gap);
    }
    lastUsed.set(id, date);
  };

  for (let k = 0; k < opts.days; k++) {
    const date = addDays(opts.start, k);
    if (opts.keepBefore && date < opts.keepBefore) {
      const day = existing[date];
      if (!day) throw new Error(`${date} is before --keep-before but missing from the existing schedule`);
      schedule[date] = { ...day };
      for (const t of TIERS) use(day[t], date);
      continue;
    }
    const day = {} as Record<Tier, string>;
    for (const t of TIERS) {
      // Longest-rested first; never-used riddles count as rested forever and keep pool order.
      const pick = pools[t]
        .map((id, i) => ({ id, i, last: lastUsed.get(id) }))
        .filter((c) => !c.last || daysBetween(c.last, date) >= REPEAT_GAP_DAYS)
        .sort((a, b) => (a.last === b.last ? a.i - b.i : !a.last ? -1 : !b.last ? 1 : a.last < b.last ? -1 : 1))[0];
      if (!pick) {
        throw new Error(`Not enough ${t} riddles: ${pools[t].length} in the pool, but a riddle may only return after ${REPEAT_GAP_DAYS} days (stuck on ${date})`);
      }
      day[t] = pick.id;
      use(pick.id, date);
    }
    schedule[date] = day as Schedule[string];
  }

  const seen = new Set<string>();
  let repeatedTrios = 0;
  for (const d of dates(schedule)) {
    const key = TIERS.map((t) => schedule[d][t]).join('|');
    if (seen.has(key)) repeatedTrios++;
    seen.add(key);
  }
  return {
    schedule,
    pools: Object.fromEntries(TIERS.map((t) => [t, pools[t].length])) as Record<Tier, number>,
    minGap,
    repeatedTrios,
  };
}
