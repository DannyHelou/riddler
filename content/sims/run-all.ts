/**
 * Reference for scripts/verify.ts: runs every sim and fails on mismatch (§8.4).
 * Usage: npx tsx content/sims/run-all.ts
 */
import * as bayes from './bayes-disease-test';
import * as birthday from './birthday-23';
import * as coin from './coin-two-heads';

const SIMS = { 'bayes-disease-test': bayes, 'birthday-23': birthday, 'coin-two-heads': coin };
const KEPT_TRIALS = 1_000_000;
const MAX_ATTEMPTS = 200_000_000;

let failed = false;
for (const [id, sim] of Object.entries(SIMS)) {
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
  const ok = sim.kind === 'probability'
    ? Math.abs(estimate - sim.expected) <= 0.5
    : Math.abs(estimate - sim.expected) / sim.expected <= 0.01;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id}: estimate ${estimate.toFixed(3)}, expected ${sim.expected} (${kept} trials)`);
  if (!ok) failed = true;
}
process.exit(failed ? 1 : 0);
