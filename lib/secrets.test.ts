import { describe, expect, it } from 'vitest';
import { assertServer, findEnvMistakes, findLeaks } from './secrets';

const env = { TYPESAFE_API_KEY: 'ts-live-0123456789abcdef', VOYAGE_API_KEY: 'short' };

describe('findLeaks', () => {
  it('finds secret values in files', () => {
    const leaks = findLeaks([{ path: 'a.js', text: 'x="ts-live-0123456789abcdef"' }, { path: 'b.js', text: 'clean' }], env);
    expect(leaks).toEqual([{ file: 'a.js', what: 'value of TYPESAFE_API_KEY' }]);
  });

  it('ignores values too short to be real keys', () => {
    expect(findLeaks([{ path: 'a.js', text: 'short' }], env)).toEqual([]);
  });

  it('optionally flags secret variable names (server code in a client bundle)', () => {
    const files = [{ path: 'c.js', text: 'process.env.SUPABASE_SERVICE_ROLE_KEY' }];
    expect(findLeaks(files, {})).toEqual([]);
    expect(findLeaks(files, {}, { names: true })).toEqual([{ file: 'c.js', what: 'reference to SUPABASE_SERVICE_ROLE_KEY' }]);
  });
});

describe('findEnvMistakes', () => {
  it('allows the public-by-design variables', () => {
    expect(findEnvMistakes({ NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', NEXT_PUBLIC_POSTHOG_KEY: 'phc_123' })).toEqual([]);
  });

  it('flags secret-looking public variables and copied secrets', () => {
    expect(findEnvMistakes({ NEXT_PUBLIC_TYPESAFE_API_KEY: 'x' })[0]).toMatch(/looks like a secret/);
    expect(findEnvMistakes({ ...env, NEXT_PUBLIC_SITE_DOMAIN: 'ts-live-0123456789abcdef' })[0]).toMatch(/same value as TYPESAFE_API_KEY/);
  });
});

describe('assertServer', () => {
  it('passes on the server', () => {
    expect(() => assertServer('lib/judge')).not.toThrow();
  });
});
