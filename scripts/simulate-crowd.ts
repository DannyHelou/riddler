/**
 * Development only: plays today's set N times with simulated players through the
 * real game service, so the Results page has crowd stats, trap rates and an RQ.
 * Refuses to run against Supabase unless --force is passed.
 *
 *   npx tsx scripts/simulate-crowd.ts 60
 */
import { config } from 'dotenv';
import { randomUUID } from 'node:crypto';

config({ path: '.env.local', quiet: true });

async function main() {
  const { supabaseConfigured } = await import('../lib/db');
  if (supabaseConfigured() && !process.argv.includes('--force')) {
    console.error('Supabase is configured. Pass --force to write simulated plays to it.');
    process.exit(1);
  }
  const game = await import('../lib/game');
  const n = Number(process.argv[2] ?? 40);
  // Guesses a crowd might give, per riddle id: a mix of truth, trap, and noise.
  const guesses: Record<string, () => string> = {
    'widget-machines': () => pick(['5', '5', '5', '100', '100', '20', '1', '10']),
    'bayes-disease-test': () => pick(['99', '99', '95', '90', '9', '10', '50', '1', '11', '80']),
    'birthday-23': () => pick(['6', '6.3', '7', '50', '51', '10', '25', '30', '1', '70']),
    'rope-around-earth': () => pick(['0.001', '0.01', '16', '15.9', '1', '100', '0', '0.1']),
    'coin-two-heads': () => pick(['4', '4', '6', '6', '3', '5', '8', '10']),
    'keys-no-locks': () => pick(['piano', 'piano', 'keyboard', 'keychain', 'key ring', 'door', 'a map', 'locksmith']),
  };
  // Riddle by riddle for everyone at once: serve to all, wait for the fuel to light (served_at
  // is a moment in the future, §5.3), then answer. Three short waits instead of one per player.
  const devices = Array.from({ length: n }, () => randomUUID());
  for (const device of devices) await game.startPlay(device);
  for (const slot of [1, 2, 3] as const) {
    const served = [];
    for (const device of devices) served.push(await game.serveRiddle(device, slot));
    const litAt = Math.max(...served.map((r) => Date.parse(r.servedAt)));
    await new Promise((res) => setTimeout(res, Math.max(0, litAt - Date.now()) + 50));
    for (let i = 0; i < n; i++) {
      const r = served[i];
      // Find the riddle id through the served prompt (the service never exposes ids to clients).
      const id = Object.keys(guesses).find((k) => r.promptMd && idMatches(k, r.promptMd)) ?? '';
      const input = Math.random() < 0.05 ? null : (guesses[id]?.() ?? '1');
      try {
        await game.submitAnswer(devices[i], slot, input === '0' ? '1' : input);
      } catch {
        await game.submitAnswer(devices[i], slot, null);
      }
    }
  }
  const done = n;
  console.log(`Simulated ${done} finished plays.`);
}

function pick<T>(xs: T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}

function idMatches(id: string, prompt: string) {
  const hints: Record<string, string> = {
    'widget-machines': 'widgets',
    'bayes-disease-test': 'disease',
    'birthday-23': 'birthday',
    'rope-around-earth': 'rope',
    'coin-two-heads': 'two heads',
    'keys-no-locks': 'keys',
  };
  return prompt.includes(hints[id]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
