/**
 * API-key hygiene. The server-only keys below must never reach the browser, a log, or git.
 * `assertServer` guards the modules that read them; `findLeaks` and `findEnvMistakes` back
 * `npm run check-secrets`, which runs after every `npm run build` and fails the build
 * (and so a Vercel deploy) on a leak.
 */

/** Environment variables that hold secrets. Server only; never prefix any of them with NEXT_PUBLIC_. */
export const SERVER_SECRETS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'TYPESAFE_API_KEY',
  'ANTHROPIC_API_KEY',
  // Added by Vercel's Supabase integration; the app doesn't read them, but they must stay private too.
  'SUPABASE_JWT_SECRET',
  'SUPABASE_SECRET_KEY',
  'POSTGRES_PASSWORD',
  'POSTGRES_URL',
  'POSTGRES_URL_NON_POOLING',
  'POSTGRES_PRISMA_URL',
] as const;

/** Public by design: shipped to the browser on purpose. Supabase's anon/publishable key can't read
 * anything here (RLS is on with no policies; only the service-role key gets through). */
export const PUBLIC_ALLOWLIST = new Set([
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SITE_DOMAIN',
  'NEXT_PUBLIC_POSTHOG_KEY',
  'NEXT_PUBLIC_POSTHOG_HOST',
]);

/** Throws if a server-only module is ever evaluated in a browser bundle. */
export function assertServer(module: string) {
  if (typeof window !== 'undefined') throw new Error(`${module} is server-only and must not be imported by client code`);
}

/** Values shorter than this aren't treated as secrets (avoids false hits on placeholders). */
const MIN_SECRET_LENGTH = 12;

export interface Leak {
  file: string;
  what: string;
}

/**
 * Scan text files for secret values (from `env`) and for the secrets' variable names. A name in a
 * client bundle means server code was bundled for the browser, even if the value isn't there yet.
 */
export function findLeaks(files: { path: string; text: string }[], env: Record<string, string | undefined>, opts: { names?: boolean } = {}): Leak[] {
  const leaks: Leak[] = [];
  const values = SERVER_SECRETS.map((name) => ({ name, value: env[name]?.trim() })).filter((s) => s.value && s.value.length >= MIN_SECRET_LENGTH);
  for (const f of files) {
    for (const s of values) if (f.text.includes(s.value!)) leaks.push({ file: f.path, what: `value of ${s.name}` });
    if (opts.names) for (const name of SERVER_SECRETS) if (f.text.includes(name)) leaks.push({ file: f.path, what: `reference to ${name}` });
  }
  return leaks;
}

/** Misconfigurations that would publish a key: secret-looking NEXT_PUBLIC_ vars, or a secret copied into one. */
export function findEnvMistakes(env: Record<string, string | undefined>): string[] {
  const out: string[] = [];
  const secretValues = new Map(SERVER_SECRETS.map((n) => [env[n]?.trim(), n] as const).filter(([v]) => v && v.length >= MIN_SECRET_LENGTH));
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith('NEXT_PUBLIC_')) continue;
    if (!PUBLIC_ALLOWLIST.has(name) && /KEY|SECRET|TOKEN|PASSWORD|SERVICE_ROLE/i.test(name)) out.push(`${name} looks like a secret but NEXT_PUBLIC_ variables are sent to every browser`);
    const v = value?.trim();
    if (v && secretValues.has(v)) out.push(`${name} holds the same value as ${secretValues.get(v)}, which would publish it`);
  }
  return out;
}
