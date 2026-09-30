/**
 * Anonymous device identity (§7.2): a UUID v4 in an httpOnly cookie, 1-year expiry.
 * The browser mirrors it in localStorage and sends it back as `x-burner-device`
 * so a cleared cookie can be restored. Deliberately weak anti-cheat for the MVP:
 * anyone can mint a new ID and replay the day.
 */
import { NextResponse, type NextRequest } from 'next/server';

export const DEVICE_COOKIE = 'burner_device';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function middleware(req: NextRequest) {
  const existing = req.cookies.get(DEVICE_COOKIE)?.value;
  if (existing && UUID.test(existing)) return NextResponse.next();

  const mirrored = req.headers.get('x-burner-device');
  const id = mirrored && UUID.test(mirrored) ? mirrored.toLowerCase() : crypto.randomUUID();

  // Make the new ID visible to this same request's route handler / server component.
  const headers = new Headers(req.headers);
  const others = (req.headers.get('cookie') ?? '').split(';').map((s) => s.trim()).filter((c) => c && !c.startsWith(`${DEVICE_COOKIE}=`));
  headers.set('cookie', [...others, `${DEVICE_COOKIE}=${id}`].join('; '));
  const res = NextResponse.next({ request: { headers } });
  res.cookies.set(DEVICE_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
