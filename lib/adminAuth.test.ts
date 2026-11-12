import { describe, expect, it } from 'vitest';
import { checkSession, hashPassword, makeSession, verifyPassword } from './adminAuth';

describe('admin auth', () => {
  it('verifies a password against its hash', () => {
    const h = hashPassword('correct horse battery');
    expect(h.startsWith('scrypt:')).toBe(true);
    expect(verifyPassword('correct horse battery', h)).toBe(true);
    expect(verifyPassword('wrong', h)).toBe(false);
    expect(verifyPassword('anything', undefined)).toBe(false);
    expect(verifyPassword('anything', 'garbage')).toBe(false);
  });

  it('signs and checks session cookies', () => {
    const now = 1_800_000_000_000;
    const s = makeSession('secret', now);
    expect(checkSession(s, 'secret', now + 1000)).toBe(true);
    expect(checkSession(s, 'other', now)).toBe(false);
    expect(checkSession(s, 'secret', now + 31 * 86_400_000)).toBe(false);
    const [exp, sig] = s.split('.');
    expect(checkSession(`${Number(exp) + 1}.${sig}`, 'secret', now)).toBe(false);
    expect(checkSession(undefined, 'secret', now)).toBe(false);
  });
});
