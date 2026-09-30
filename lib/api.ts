/** Helpers shared by the API route handlers. Server only. */
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { GameError } from './game';

const DEVICE_COOKIE = 'burner_device';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function deviceId(): Promise<string | null> {
  const v = (await cookies()).get(DEVICE_COOKIE)?.value;
  return v && UUID.test(v) ? v : null;
}

export async function requireDevice(): Promise<string> {
  const id = await deviceId();
  if (!id) throw new GameError(401, 'Missing device id');
  return id;
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function handle<T>(fn: () => Promise<T>) {
  try {
    return NextResponse.json(await fn(), { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    if (e instanceof GameError) return NextResponse.json({ error: e.message, ...e.extra }, { status: e.status, headers: { 'cache-control': 'no-store' } });
    console.error(e);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
