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

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** Constants a player may type as the answer, alone or in a ratio ("e", "1 in e", "2/π"). */
const CONSTANTS: Record<string, number> = { e: Math.E, pi: Math.PI, π: Math.PI };

/** Words that are part of the number, never a unit: numbers in words, constants, signs. */
const NUMBER_WORDS = new Set(
  ('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen ' +
    'seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred hundreds ' +
    'dozen dozens half halves third thirds quarter quarters minus negative e pi').split(' '),
);

/**
 * Units of the same kind convert to the riddle's unit ("1 m" on a cm riddle is 100, "2 hours" on a
 * minutes riddle is 120), in whole base units so the factors stay exact. Length comes first so a
 * riddle in "m" means metres; on a time riddle a typed "m" means minutes.
 */
const DIMENSIONS: Record<string, number>[] = [
  {
    mm: 1, millimetre: 1, millimetres: 1, millimeter: 1, millimeters: 1,
    cm: 10, centimetre: 10, centimetres: 10, centimeter: 10, centimeters: 10,
    m: 1000, metre: 1000, metres: 1000, meter: 1000, meters: 1000,
    km: 1e6, kilometre: 1e6, kilometres: 1e6, kilometer: 1e6, kilometers: 1e6,
  },
  {
    s: 1, sec: 1, secs: 1, second: 1, seconds: 1,
    m: 60, min: 60, mins: 60, minute: 60, minutes: 60,
    h: 3600, hr: 3600, hrs: 3600, hour: 3600, hours: 3600,
    day: 86400, days: 86400, week: 604800, weeks: 604800,
    year: 31557600, years: 31557600, yr: 31557600, yrs: 31557600,
  },
  { g: 1, gram: 1, grams: 1, kg: 1000, kilo: 1000, kilos: 1000, kilogram: 1000, kilograms: 1000 },
];

const normLabel = (unitLabel?: string | null) => (unitLabel ?? '').normalize('NFKC').trim().toLowerCase();

/** "2 hours" on a minutes riddle -> { s: "2", factor: 60 }; null when the word isn't a unit of the riddle's kind. */
function convertUnit(s: string, unitLabel?: string | null): { s: string; factor: number } | null {
  const label = normLabel(unitLabel);
  const dim = DIMENSIONS.find((d) => has(d, label));
  if (!dim) return null;
  const m = /^(.*?\d)\s*([a-z]+)(?:\s+[a-z][a-z./]*)*$/.exec(s);
  if (!m || !has(dim, m[2])) return null;
  return { s: m[1].trim(), factor: dim[m[2]] / dim[label] };
}

/** Other unit words a player may type after the number; stripped before parsing. */
function unitVariants(unitLabel?: string | null): string[] {
  // Same normalization as the answer, so "m²" matches what the player typed.
  const u = normLabel(unitLabel);
  if (!u || u === '%') return [];
  const out = new Set([u]);
  // Singular of a plural word ("flips" -> "flip"); never for a one-letter unit like "s".
  if (u.length > 1 && u.endsWith('s')) out.add(u.slice(0, -1));
  const extra: Record<string, string[]> = {
    '°': ['degree', 'degrees', 'deg'],
    'km/h': ['kph', 'kmh'],
    flips: ['flip', 'tosses', 'toss'],
  };
  for (const e of extra[u] ?? []) out.add(e);
  // Longest first so "minutes" is stripped before "min".
  return [...out].sort((a, b) => b.length - a.length);
}

/** Words before the number ("day 8", "all 10 rungs", "every 6 minutes"); not "one in 5" or "minus 3". */
function stripLeadingWords(s: string): string {
  const m = /^((?:[a-z]+\s+)+)(?=[$€£]?[\d.])/.exec(s);
  if (!m) return s;
  if (m[1].trim().split(/\s+/).some((w) => NUMBER_WORDS.has(w) || has(MULTIPLIERS, w))) return s;
  return s.slice(m[1].length);
}

/**
 * Any other words after the number ("80 seconds", "12 apples", "1 in 11 chance"): the unit is
 * optional and already shown in the box, so a unit word never decides the answer. Multipliers
 * ("2.5 million") and "percent" stay; a number in words ("1 in eleven") leaves the input as typed.
 */
function stripTrailingWords(s: string): string {
  const m = /^(.*?\d)\s*([a-z][a-z./]*(?:\s+[a-z][a-z./]*)*)$/.exec(s);
  if (!m) return s;
  const words = m[2].split(/\s+/);
  if (words.some((w) => NUMBER_WORDS.has(w))) return s;
  while (words.length && !has(MULTIPLIERS, words[words.length - 1]) && words[words.length - 1] !== 'percent') words.pop();
  return [m[1], ...words].join(' ');
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
  if (has(CONSTANTS, s)) return CONSTANTS[s];
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
  s = stripLeadingWords(s);
  // Currency signs ("$5", "5€")
  s = s.replace(/^[$€£]\s*/, '').replace(/\s*[$€£]$/, '');

  // A unit of the riddle's kind converts ("1 m" on a cm riddle); otherwise the riddle's own unit word is stripped.
  let unitFactor = 1;
  const conv = convertUnit(s, unitLabel);
  if (conv) {
    s = conv.s;
    unitFactor = conv.factor;
  } else {
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
  }
  s = stripTrailingWords(s);

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
  if (unitFactor !== 1) {
    value *= unitFactor;
    reading = `Reads as ${formatNumber(value)} ${unitLabel}`;
  } else if (isRatio || hasPercent || !/^[+-]?[\d.]+$/.test(s)) {
    reading = `Reads as ${formatNumber(value)}`;
  }
  return { ok: true, value, reading };
}
