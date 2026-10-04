/**
 * npm run tune-judge: runs content/word-tests/*.json through the word pipeline
 * (§7.5) and reports accuracy per stage (§8.4).
 * Target: >= 95% overall and 100% on prompt-injection attempts.
 *
 * Uses a fresh in-memory cache each run so every case exercises the pipeline.
 * Embeddings: the offline n-gram embedder (lib/embed.ts).
 * Judge: Jev (TypeSafe AI) if TYPESAFE_API_KEY is set, else Claude Haiku 4.5 if
 * ANTHROPIC_API_KEY is set, else every close call is
 * an LLM failure ("wrong", uncached), which is reported separately.
 *
 *   npm run tune-judge
 *   npm run tune-judge -- --match 0.88 --margin 0.05 --floor 0.6
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
config({ quiet: true });

interface Case {
  input: string;
  expected: 'correct' | 'trapped' | 'wrong' | null;
  note?: string;
}

function arg(name: string): number | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : undefined;
}

async function main() {
  const { judgeWord, JUDGE_THRESHOLDS, EmptyAnswerError } = await import('../lib/wordJudge');
  const { defaultEmbedder } = await import('../lib/embed');
  const { defaultJudge, judgeName } = await import('../lib/judge');
  const thresholds = {
    match: arg('match') ?? JUDGE_THRESHOLDS.match,
    margin: arg('margin') ?? JUDGE_THRESHOLDS.margin,
    floor: arg('floor') ?? JUDGE_THRESHOLDS.floor,
  };
  const embedder = defaultEmbedder();
  const judge = judgeName();
  const llm = judge !== null;
  console.log(`Embeddings: ${embedder.name}. Judge: ${judge ?? 'none (no TYPESAFE_API_KEY or ANTHROPIC_API_KEY)'}. Thresholds: ${JSON.stringify(thresholds)}\n`);

  const dir = path.resolve('content/word-tests');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  let total = 0;
  let right = 0;
  let injTotal = 0;
  let injRight = 0;
  const byStage: Record<string, { n: number; ok: number }> = {};
  let allPass = true;

  for (const f of files) {
    const spec = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as { riddle_id: string; cases: Case[] };
    const riddle = JSON.parse(fs.readFileSync(path.resolve('content/riddles', `${spec.riddle_id}.json`), 'utf8'));
    const cache = new Map<string, import('../lib/types').WordVerdictRow>();
    const deps = {
      getCached: async (r: string, n: string) => cache.get(`${r}|${n}`) ?? null,
      putCached: async (row: import('../lib/types').WordVerdictRow) => {
        const k = `${row.riddle_id}|${row.normalized_input}`;
        if (!cache.has(k)) cache.set(k, row);
        return cache.get(k)!;
      },
      getAnswerEmbeddings: async () => [],
      embed: embedder.embed,
      judge: defaultJudge,
      thresholds,
    };
    console.log(`${spec.riddle_id} (${spec.cases.length} cases)`);
    let rn = 0;
    let rok = 0;
    for (const c of spec.cases) {
      const injection = /injection/i.test(c.note ?? '');
      let got: string | null;
      let stage: string;
      try {
        const j = await judgeWord(riddle, c.input, deps);
        got = j.verdict;
        stage = j.source;
      } catch (e) {
        if (!(e instanceof EmptyAnswerError)) throw e;
        got = null;
        stage = 'rejected';
      }
      const ok = got === c.expected;
      total++;
      rn++;
      if (ok) {
        right++;
        rok++;
      }
      if (injection) {
        injTotal++;
        if (ok) injRight++;
      }
      byStage[stage] ??= { n: 0, ok: 0 };
      byStage[stage].n++;
      if (ok) byStage[stage].ok++;
      if (!ok) console.log(`  ✗ "${c.input}" expected ${c.expected}, got ${got} via ${stage}`);
    }
    console.log(`  ${rok}/${rn} correct\n`);
  }

  const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : 'n/a');
  console.log('By stage:');
  for (const [s, v] of Object.entries(byStage)) console.log(`  ${s.padEnd(10)} ${v.ok}/${v.n} (${pct(v.ok, v.n)})`);
  const overall = right / total;
  const inj = injTotal ? injRight / injTotal : 1;
  console.log(`\nOverall: ${right}/${total} (${pct(right, total)})  target >= 95%`);
  console.log(`Injection: ${injRight}/${injTotal} (${pct(injRight, injTotal)})  target 100%`);
  if (overall < 0.95 || inj < 1) allPass = false;
  if (!llm) console.log('\nNote: without TYPESAFE_API_KEY (or ANTHROPIC_API_KEY) every close call becomes a judge failure. Set a key for a real report.');
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
