/**
 * Deterministic number parser (design brief §7.4). No AI.
 *
 * The same function runs in the browser (live preview under the input) and on
 * the server (scoring). The server result is authoritative.
 */

export type NumberFormat = 'percent' | 'quantity';

export type ParseResult =
  | { ok: true; value: number; reading: string | null }
  | { ok: false; reason: string };

const MULTIPLIERS: Record<string, number> = {
  k: 1e3,
  thousand: 1e3,
  thousands: 1e3,
  m: 1e6,
  mm: 1e6,
  mn: 1e6,
  mil: 1e6,
  million: 1e6,
  millions: 1e6,
  b: 1e9,
  bn: 1e9,
  billion: 1e9,
  billions: 1e9,
  t: 1e12,
  tn: 1e12,
  trillion: 1e12,
  trillions: 1e12,
};

/** Unit words a player may type after the number; stripped before parsing. */
function unitVariants(unitLabel?: string | null): string[] {
  if (!unitLabel) return [];
  const u = unitLabel.trim().toLowerCase();
  if (!u || u === '%') return [];
  const out = new Set([u]);
  if (u.endsWith('s')) out.add(u.slice(0, -1));
  const extra: Record<string, string[]> = {
    minutes: ['min', 'mins', 'minute'],
    seconds: ['s', 'sec', 'secs', 'second'],
    hours: ['h', 'hr', 'hrs', 'hour'],
    cm: ['centimetres', 'centimeters', 'centimetre', 'centimeter'],
    flips: ['flip', 'tosses', 'toss'],
  };
  for (const e of extra[u] ?? []) out.add(e);
  // Longest first so "minutes" is stripped before "min".
  return [...out].sort((a, b) => b.length - a.length);
}

/** Parse a plain decimal with optional thousands separators. */
function parsePlain(s: string): number | null {
  // 25,000,000 or 1,234.5
  if (/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return Number(s.replace(/,/g, ''));
  // 25 000 000 (spaces already normalized to a single ASCII space)
  if (/^[+-]?\d{1,3}( \d{3})+(\.\d+)?$/.test(s)) return Number(s.replace(/ /g, ''));
  // 9,5 (decimal comma)
  if (/^[+-]?\d+,\d{1,2}$/.test(s)) return Number(s.replace(',', '.'));
  // 12, 12.5, .5, 2.5e7
  if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/.test(s)) return Number(s);
  return null;
}

/** Parse "25m", "2.5 k", "1.2 billion" etc. */
function parseWithMultiplier(s: string): number | null {
  const m = /^(.*?)\s*([a-z]+)$/.exec(s);
  if (!m) return parsePlain(s);
  const mult = MULTIPLIERS[m[2]];
  if (mult === undefined) return null;
  const base = parsePlain(m[1].trim());
  return base === null ? null : base * mult;
}

function round(v: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

export function formatNumber(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  const abs = Math.abs(v);
  if (abs !== 0 && (abs < 0.001 || abs >= 1e15)) return v.toExponential(2);
  const dp = abs >= 100 ? 2 : abs >= 1 ? 3 : 4;
  return round(v, dp).toLocaleString('en-US', { maximumFractionDigits: dp });
}

export function parseNumber(raw: string, format: NumberFormat, unitLabel?: string | null): ParseResult {
  if (typeof raw !== 'string') return { ok: false, reason: 'Type a number' };
  let s = raw
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[   \s]+/g, ' ')
    .replace(/[−–]/g, '-')
    .trim();
  if (!s) return { ok: false, reason: 'Type a number' };
  if (s.length > 40) return { ok: false, reason: 'That answer is too long' };

  // Leading "about", "~", "≈"
  s = s.replace(/^(about|around|approx\.?|approximately|roughly|~|≈)\s*/, '');

  // Trailing unit word ("5 minutes", "16 cm")
  for (const u of unitVariants(unitLabel)) {
    if (s.endsWith(u) && s.length > u.length) {
      const before = s.slice(0, -u.length);
      // Only strip whole words (or directly attached like "16cm").
      if (!/[a-z]$/.test(before)) {
        s = before.trim();
        break;
      }
    }
  }

  let hasPercent = false;
  if (s.endsWith('%')) {
    hasPercent = true;
    s = s.slice(0, -1).trim();
  } else if (s.endsWith('percent')) {
    hasPercent = true;
    s = s.slice(0, -'percent'.length).trim();
  }
  if (!s) return { ok: false, reason: 'Type a number' };

  let value: number | null = null;
  let reading: string | null = null;
  let isRatio = false;

  // "1 in 11", "1/11", "1 out of 11"
  const ratio = /^(.+?)(?:\s*\/\s*|\s+in\s+|\s+out of\s+)(.+)$/.exec(s);
  if (ratio && !/e/.test(ratio[1]) && !hasPercent) {
    const a = parseWithMultiplier(ratio[1].trim());
    const b = parseWithMultiplier(ratio[2].trim());
    if (a !== null && b !== null) {
      if (b === 0) return { ok: false, reason: "Can't divide by zero" };
      value = a / b;
      isRatio = true;
    }
  }
  if (value === null) value = parseWithMultiplier(s);
  if (value === null || !Number.isFinite(value)) {
    return { ok: false, reason: format === 'percent' ? 'Type a number from 0 to 100' : 'Type a number, like 12 or 2.5k' };
  }

  if (format === 'percent') {
    if (isRatio) {
      value = value * 100;
      reading = `Reads as ${formatNumber(value)}%`;
    } else if (!hasPercent && value > 0 && value <= 1 && s.includes('.')) {
      // 0.09 on a percent riddle is read as a fraction (§7.4).
      value = value * 100;
      reading = `Reads as ${formatNumber(value)}%`;
    }
    if (value < 0 || value > 100) return { ok: false, reason: 'Type a number from 0 to 100' };
    return { ok: true, value, reading };
  }

  if (hasPercent) value = value / 100;
  if (value <= 0) return { ok: false, reason: 'Type a number above 0' };
  if (isRatio || hasPercent || !/^[+-]?[\d.]+$/.test(s)) {
    reading = `Reads as ${formatNumber(value)}`;
  }
  return { ok: true, value, reading };
}
