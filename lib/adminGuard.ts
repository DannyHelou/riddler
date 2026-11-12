/** Admin page guard: redirects to /admin/login without a valid session. Server only. */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, checkSession, sessionSecret } from './adminAuth';

export async function isAdmin(): Promise<boolean> {
  return checkSession((await cookies()).get(ADMIN_COOKIE)?.value, sessionSecret());
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect('/admin/login');
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const DATE = /^\d{4}-\d{2}-\d{2}$/;
