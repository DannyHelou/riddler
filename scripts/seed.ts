/**
 * npm run seed: validate content/ (§8.3), then upsert riddles, the schedule,
 * and answer embeddings into the configured store (Supabase, or the local file).
 *
 *   npm run seed            # validate + load
 *   npm run seed -- --check # validate only
 */
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
config({ quiet: true });

async function main() {
  const { loadContent, validateContent, seedStore } = await import('../lib/contentLoader');
  const { getStore } = await import('../lib/db');
  const { defaultEmbedder } = await import('../lib/embed');

  const content = loadContent();
  const { errors } = validateContent(content);
  if (errors.length) {
    console.error(`✗ Content is invalid (${errors.length} problem${errors.length === 1 ? '' : 's'}):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`✓ ${content.riddles.length} riddles and ${Object.keys(content.schedule).filter((k) => !k.startsWith('_')).length} scheduled days are valid`);
  if (process.argv.includes('--check')) return;

  const store = await getStore();
  const embedder = defaultEmbedder();
  console.log(`Loading into the ${store.kind} store, embeddings: ${embedder.name}`);
  await seedStore(store, embedder.embed, (s) => console.log(`  ${s}`));
  console.log('✓ Seeded');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
