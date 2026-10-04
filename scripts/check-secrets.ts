/**
 * npm run check-secrets: fail if an API key could reach a browser or git.
 * Runs automatically after `npm run build` (so a leaking Vercel deploy fails), or on its own.
 *
 * 1. Environment: no secret in a NEXT_PUBLIC_ variable (those are inlined into browser code).
 * 2. Browser output (<distDir>/static, prerendered HTML/RSC): no secret values, no secret names.
 * 3. Git: no secret values in tracked files.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { config } from 'dotenv';
import { findEnvMistakes, findLeaks, type Leak } from '../lib/secrets';

config({ path: '.env.local', quiet: true });
config({ quiet: true });

const TEXT = /\.(js|mjs|cjs|css|html|rsc|json|txt|map|body|meta)$/;
const MAX_BYTES = 20_000_000;

function walk(dir: string, filter: (p: string) => boolean): { path: string; text: string }[] {
  if (!fs.existsSync(dir)) return [];
  const out: { path: string; text: string }[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, filter));
    else if (filter(p) && fs.statSync(p).size <= MAX_BYTES) out.push({ path: p, text: fs.readFileSync(p, 'utf8') });
  }
  return out;
}

const env = process.env as Record<string, string | undefined>;
const problems: string[] = [];

// 1. Environment
problems.push(...findEnvMistakes(env));

// 2. Browser output
const dist = path.resolve(process.env.NEXT_DIST_DIR || '.next');
const clientFiles = walk(path.join(dist, 'static'), (p) => TEXT.test(p));
const prerendered = walk(path.join(dist, 'server', 'app'), (p) => /\.(html|rsc|body)$/.test(p));
const show = (l: Leak) => `${l.what} in ${path.relative(process.cwd(), l.file)}`;
if (!clientFiles.length) console.warn(`! No build output in ${path.relative(process.cwd(), dist)}/static: run after \`next build\` to scan the browser bundle.`);
problems.push(...findLeaks([...clientFiles, ...prerendered], env, { names: true }).map(show));

// 3. Git-tracked files
try {
  const tracked = execSync('git ls-files -z', { encoding: 'utf8' }).split('\0').filter(Boolean);
  const files = tracked
    .filter((f) => fs.existsSync(f) && fs.statSync(f).size <= MAX_BYTES)
    .map((f) => ({ path: f, text: fs.readFileSync(f, 'utf8') }));
  problems.push(...findLeaks(files, env).map(show));
} catch {
  console.warn('! git not available: skipped the tracked-files scan.');
}

if (problems.length) {
  console.error(`✗ Secrets check failed (${problems.length}):`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('Never commit .env files or prefix a key with NEXT_PUBLIC_. If a key was exposed, rotate it with the provider.');
  process.exit(1);
}
console.log(`✓ Secrets check passed (${clientFiles.length + prerendered.length} browser files scanned, environment OK, git clean)`);
