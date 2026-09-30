'use client';
/** Browser-side API client. Mirrors the device ID in localStorage (§7.2). */

const KEY = 'burner_device';

export function mirroredDevice(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function rememberDevice(id: string | undefined | null) {
  if (!id) return;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* private mode */
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public body: Record<string, unknown>) {
    super(message);
  }
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' };
  const dev = mirroredDevice();
  if (dev) headers['x-burner-device'] = dev;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
    credentials: 'same-origin',
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new ApiError(res.status, String(json.error ?? 'Something went wrong'), json);
  if (typeof json.deviceId === 'string') rememberDevice(json.deviceId);
  return json as T;
}
