/**
 * Applies supabase/migrations/*.sql that haven't run yet, in name order, each in its own
 * transaction, and records them in `schema_migrations`. Runs before every build (so a Vercel
 * deploy migrates production with the integration's POSTGRES_URL_NON_POOLING), and does
 * nothing locally, where there's no Postgres URL.
 *
 * Fails soft: a database blip must not block a deploy. The app treats a missing table as
 * "analytics off" (event writes are swallowed), so a skipped migration only loses events.
 */
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

const DIR = path.resolve('supabase/migrations');

/** The Vercel/Supabase URLs carry extra query params (e.g. `supa=`) that Postgres rejects as settings. */
function cleanUrl(raw: string): string {
  const u = new URL(raw);
  u.search = '';
  return u.toString();
}

async function main() {
  const raw = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!raw) {
    console.log('migrate: no POSTGRES_URL_NON_POOLING / POSTGRES_URL, skipping');
    return;
  }
  const sql = postgres(cleanUrl(raw), { ssl: 'require', prepare: false, max: 1, connect_timeout: 15, onnotice: () => {} });
  try {
    await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
    await sql`alter table schema_migrations enable row level security`;
    const done = new Set((await sql<{ name: string }[]>`select name from schema_migrations`).map((r) => r.name));
    const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
    for (const f of files) {
      if (done.has(f)) continue;
      const text = fs.readFileSync(path.join(DIR, f), 'utf8');
      await sql.begin(async (tx) => {
        await tx.unsafe(text);
        await tx`insert into schema_migrations (name) values (${f})`;
      });
      console.log(`migrate: applied ${f}`);
    }
    console.log('migrate: up to date');
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.warn(`migrate: FAILED, continuing the build without it: ${e instanceof Error ? e.message : e}`);
});
