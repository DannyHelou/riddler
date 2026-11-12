'use server';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, SESSION_DAYS, makeSession, sessionSecret, verifyPassword } from '@/lib/adminAuth';
import { RateLimiter } from '@/lib/events';

// 10 tries per 15 minutes per IP (per server instance).
const tries = new RateLimiter(10, 15 * 60_000);

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!tries.allow(ip)) return 'Too many tries. Wait 15 minutes.';
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const secret = sessionSecret();
  if (!hash || !secret) return 'The dashboard isn’t set up: ADMIN_PASSWORD_HASH is missing.';
  const password = String(form.get('password') ?? '');
  if (!verifyPassword(password, hash)) return 'Wrong password.';
  (await cookies()).set(ADMIN_COOKIE, makeSession(secret), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    maxAge: SESSION_DAYS * 86_400,
  });
  redirect('/admin');
}

export async function logout() {
  (await cookies()).delete({ name: ADMIN_COOKIE, path: '/admin' });
  redirect('/admin/login');
}
