/**
 * npm run verify: Monte Carlo check of every probability riddle (§8.4).
 * Port of content/sims/run-all.ts that discovers sims automatically.
 * 10^6 kept trials each; ±0.5 percentage points (probability) or ±1% relative (expectation).
 * `--only id1,id2` restricts the run to those riddles.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

interface Sim {
  expected: number;
  kind: 'probability' | 'expectation';
  simulate: () => number | null;
}

const KEPT_TRIALS = Number(process.env.VERIFY_TRIALS ?? 1_000_000);
const MAX_ATTEMPTS = 200_000_000;

async function main() {
  const dir = path.resolve('content/sims');
  // `npm run verify -- --only a,b` checks just those riddle ids.
  const i = process.argv.indexOf('--only');
  const only = i >= 0 ? new Set(process.argv[i + 1].split(',')) : null;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && f !== 'run-all.ts' && (!only || only.has(f.replace(/\.ts$/, ''))))
    .sort();
  const riddleDir = path.resolve('content/riddles');
  let failed = false;

  for (const f of files) {
    const id = f.replace(/\.ts$/, '');
    const sim = (await import(pathToFileURL(path.join(dir, f)).href)) as Sim;
    const riddlePath = path.join(riddleDir, `${id}.json`);
    if (!fs.existsSync(riddlePath)) {
      console.log(`FAIL ${id}: no matching content/riddles/${id}.json`);
      failed = true;
      continue;
    }
    const riddle = JSON.parse(fs.readFileSync(riddlePath, 'utf8')) as { answer_value: number };
    if (Math.abs(riddle.answer_value - sim.expected) > 1e-9) {
      console.log(`FAIL ${id}: sim expects ${sim.expected} but the riddle's answer_value is ${riddle.answer_value}`);
      failed = true;
      continue;
    }
    let sum = 0;
    let kept = 0;
    let attempts = 0;
    while (kept < KEPT_TRIALS && attempts < MAX_ATTEMPTS) {
      attempts++;
      const v = sim.simulate();
      if (v === null) continue;
      sum += v;
      kept++;
    }
    const estimate = sum / kept;
    const ok = sim.kind === 'probability' ? Math.abs(estimate - sim.expected) <= 0.5 : Math.abs(estimate - sim.expected) / sim.expected <= 0.01;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${id}: estimate ${estimate.toFixed(3)}, expected ${sim.expected} (${kept} trials)`);
    if (!ok) failed = true;
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
