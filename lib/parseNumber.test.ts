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
