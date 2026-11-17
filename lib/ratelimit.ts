/**
 * Rate limits for the game API. In-memory fixed windows, per device and per IP, so they are
 * per server instance (Fluid compute shares instances between requests) and deliberately
 * generous: the goal is to stop a runaway client or a cheap script, not to be airtight.
 * iCloud Private Relay puts many people behind one IP, so the IP limit stays high.
 */
import { headers } from 'next/headers';
import { RateLimiter } from './events';
import { deviceId } from './api';
import { GameError } from './game';

export type Route = 'today' | 'start' | 'serve' | 'answer' | 'results' | 'stats' | 'report';

const WINDOW_MS = 10 * 60_000;
/** Per device, per 10 minutes. A normal climb uses a handful of each. */
export const DEVICE_LIMITS: Record<Route, number> = { today: 120, start: 20, serve: 60, answer: 60, results: 120, stats: 60, report: 20 };
/** Per IP, per minute, across every game route. */
export const IP_LIMIT = 300;

export class Limits {
  private device = new Map<Route, RateLimiter>();
  private ip = new RateLimiter(IP_LIMIT, 60_000);

  /** True when the request is within limits. */
  check(route: Route, device: string | null, ip: string | null, now = Date.now()): boolean {
    let l = this.device.get(route);
    if (!l) this.device.set(route, (l = new RateLimiter(DEVICE_LIMITS[route], WINDOW_MS)));
    if (device && !l.allow(device, 1, now)) return false;
    if (ip && !this.ip.allow(ip, 1, now)) return false;
    return true;
  }
}

const limits = new Limits();

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
}

/** Throws a 429 GameError when this device or IP is over the route's limit. */
export async function rateLimit(route: Route): Promise<void> {
  if (!limits.check(route, await deviceId(), await clientIp())) throw new GameError(429, 'Slow down a little, then try again');
}
