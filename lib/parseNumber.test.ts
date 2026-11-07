import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseNumber } from './parseNumber';

const value = (raw: string, fmt: 'percent' | 'quantity', unit?: string) => {
  const r = parseNumber(raw, fmt, unit);
  if (!r.ok) throw new Error(`${raw}: ${r.reason}`);
  return r.value;
};

describe('parseNumber (§7.4)', () => {
  it('reads plain percents', () => {
    expect(value('9', 'percent')).toBe(9);
    expect(value('9%', 'percent')).toBe(9);
    expect(value('9.5 %', 'percent')).toBe(9.5);
    expect(value('9 percent', 'percent')).toBe(9);
  });

  it('reads 0.09 on a percent riddle as a fraction and says so', () => {
    const r = parseNumber('0.09', 'percent');
    expect(r).toEqual({ ok: true, value: 9, reading: 'Reads as 9%' });
    expect(value('0.5%', 'percent')).toBe(0.5);
    expect(value('1', 'percent')).toBe(1);
  });

  it('reads ratios', () => {
    expect(value('1 in 11', 'percent')).toBeCloseTo(9.0909, 3);
    expect(value('1/11', 'percent')).toBeCloseTo(9.0909, 3);
    expect(value('1 out of 11', 'percent')).toBeCloseTo(9.0909, 3);
    const r = parseNumber('1 in 11', 'percent');
    expect(r.ok && r.reading).toBe('Reads as 9.091%');
  });

  it('reads thousands separators', () => {
    expect(value('25000000', 'quantity')).toBe(25_000_000);
    expect(value('25,000,000', 'quantity')).toBe(25_000_000);
    expect(value('25 000 000', 'quantity')).toBe(25_000_000);
  });

  it('expands suffixes and words', () => {
    expect(value('25m', 'quantity')).toBe(25_000_000);
    expect(value('25 million', 'quantity')).toBe(25_000_000);
    expect(value('2.5k', 'quantity')).toBe(2500);
    expect(value('3bn', 'quantity')).toBe(3_000_000_000);
    expect(value('1.2 billion', 'quantity')).toBe(1_200_000_000);
  });

  it('reads scientific notation', () => {
    expect(value('2.5e7', 'quantity')).toBe(25_000_000);
  });

  it('strips the unit label', () => {
    expect(value('5 minutes', 'quantity', 'minutes')).toBe(5);
    expect(value('5 min', 'quantity', 'minutes')).toBe(5);
    expect(value('16cm', 'quantity', 'cm')).toBe(16);
    expect(value('6 flips', 'quantity', 'flips')).toBe(6);
  });

  it('takes a bare number when the unit is a single letter', () => {
    for (const raw of ['80', '80s', '80 s', '80 sec', '80 secs', '80 seconds', 'about 80 seconds']) {
      expect(value(raw, 'quantity', 's')).toBe(80);
    }
    expect(value('11', 'quantity', 's')).toBe(11);
    expect(value('3.3', 'quantity', 's')).toBe(3.3);
    expect(value('2', 'quantity', 'h')).toBe(2);
    expect(value('2 hours', 'quantity', 'h')).toBe(2);
    expect(value('17 minutes', 'quantity', 'min')).toBe(17);
    expect(value('5 days', 'quantity', 'day')).toBe(5);
  });

  it('reads the exact unit label, even with superscripts', () => {
    expect(value('44 m²', 'quantity', 'm²')).toBe(44);
    expect(value('10000 cm²', 'quantity', 'cm²')).toBe(10000);
    expect(value('90°', 'quantity', '°')).toBe(90);
  });

  it('ignores any unit word after the number', () => {
    expect(value('12 apples', 'quantity', 'fruits')).toBe(12);
    expect(value('90 degrees', 'quantity', '°')).toBe(90);
    expect(value('60 kph', 'quantity', 'km/h')).toBe(60);
    expect(value('7 meters', 'quantity', 'm')).toBe(7);
    expect(value('11 seconds long', 'quantity', 's')).toBe(11);
    expect(value('$5', 'quantity', 'dollars')).toBe(5);
    expect(value('1 in 11 chance', 'percent')).toBeCloseTo(9.0909, 3);
    // Multipliers and percent still mean what they say.
    expect(value('5m', 'quantity')).toBe(5_000_000);
    expect(value('2.5 thousand', 'quantity')).toBe(2500);
    expect(value('50 percent', 'quantity')).toBe(0.5);
    expect(parseNumber('abc', 'quantity').ok).toBe(false);
    expect(parseNumber('seconds', 'quantity', 's').ok).toBe(false);
  });

  it('converts a unit of the same kind and says so', () => {
    expect(parseNumber('1 m', 'quantity', 'cm')).toEqual({ ok: true, value: 100, reading: 'Reads as 100 cm' });
    expect(value('2 hours', 'quantity', 'minutes')).toBe(120);
    expect(value('90 seconds', 'quantity', 'min')).toBe(1.5);
    expect(value('2.5 km', 'quantity', 'm')).toBe(2500);
    expect(value('500 g', 'quantity', 'kg')).toBe(0.5);
    // A unit that matches the box needs no note; "m" is minutes on a time riddle, metres on a length one.
    expect(parseNumber('17m', 'quantity', 'min')).toEqual({ ok: true, value: 17, reading: null });
    expect(parseNumber('25m', 'quantity', 'm')).toEqual({ ok: true, value: 25, reading: null });
  });

  it('skips words before the number', () => {
    expect(value('day 8', 'quantity', 'day')).toBe(8);
    expect(value('all 10 rungs', 'quantity', 'rungs')).toBe(10);
    expect(value('every 6 minutes', 'quantity', 'minutes')).toBe(6);
    expect(parseNumber('one in 5', 'percent').ok).toBe(false);
    expect(parseNumber('minus 3', 'quantity').ok).toBe(false);
  });

  it('reads e and π', () => {
    expect(value('e', 'quantity', 'presses')).toBe(Math.E);
    expect(value('1 in e', 'percent')).toBeCloseTo(36.79, 2);
    expect(value('2/π', 'percent')).toBeCloseTo(63.66, 2);
    expect(value('pi', 'quantity')).toBe(Math.PI);
  });

  it('takes a bare number and number + unit for every riddle unit', () => {
    const dir = join(process.cwd(), 'content', 'riddles');
    const units = new Set<string>();
    for (const f of readdirSync(dir)) {
      const r = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      if (r.answer_type === 'number' && r.number_format === 'quantity' && r.unit_label) units.add(r.unit_label);
    }
    expect(units.size).toBeGreaterThan(10);
    for (const u of units) {
      expect(value('7', 'quantity', u), u).toBe(7);
      expect(value(`7 ${u}`, 'quantity', u), u).toBe(7);
      expect(value(`7${u}`, 'quantity', u), u).toBe(7);
    }
  });

  it('rejects bad input with a reason', () => {
    expect(parseNumber('', 'percent').ok).toBe(false);
    expect(parseNumber('abc', 'quantity').ok).toBe(false);
    expect(parseNumber('0', 'quantity')).toEqual({ ok: false, reason: 'Type a number above 0' });
    expect(parseNumber('-3', 'quantity').ok).toBe(false);
    expect(parseNumber('120', 'percent')).toEqual({ ok: false, reason: 'Type a number from 0 to 100' });
    expect(parseNumber('1/0', 'percent').ok).toBe(false);
  });

  it('is identical on client and server (pure and deterministic)', () => {
    const inputs = ['9', '9%', '9.5 %', '0.09', '1 in 11', '1/11', '25000000', '25,000,000', '25 000 000', '25m', '25 million', '2.5k', '3bn', '1.2 billion', '2.5e7'];
    for (const i of inputs) {
      for (const f of ['percent', 'quantity'] as const) expect(parseNumber(i, f)).toEqual(parseNumber(i, f));
    }
  });
});
