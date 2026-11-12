/**
 * Owner dashboard auth: one shared password. The env var holds a scrypt hash
 * (`npm run hash-password`), never the password. A signed, httpOnly session cookie
 * proves a successful login. Server only.
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { assertServer } from './secrets';

assertServer('lib/adminAuth');

export const ADMIN_COOKIE = 'riddler_admin';
export const SESSION_DAYS = 30;

/** `scrypt:<salt b64url>:<hash b64url>` (no `$`: .env files would expand it) */
export function hashPassword(password: string, salt = randomBytes(16)): string {
  const hash = scryptSync(password, salt, 32);
  return `scrypt:${salt.toString('base64url')}:${hash.toString('base64url')}`;
}

export function verifyPassword(password: string, stored: string | undefined): boolean {
  if (!stored) return false;
  const [kind, saltB64, hashB64] = stored.trim().split(':');
  if (kind !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64url');
  if (expected.length < 16) return false;
  const actual = scryptSync(password, Buffer.from(saltB64, 'base64url'), expected.length);
  return timingSafeEqual(actual, expected);
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/** The cookie value: expiry and its signature. */
export function makeSession(secret: string, now = Date.now()): string {
  const exp = String(now + SESSION_DAYS * 86_400_000);
  return `${exp}.${sign(exp, secret)}`;
}

export function checkSession(value: string | undefined, secret: string | undefined, now = Date.now()): boolean {
  if (!value || !secret) return false;
  const [exp, sig] = value.split('.');
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < now) return false;
  const want = Buffer.from(sign(exp, secret));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** The session secret, or the password hash itself when none is set (changing the password then logs everyone out). */
export function sessionSecret(): string | undefined {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD_HASH || undefined;
}

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD_HASH);
}
