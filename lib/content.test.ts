import { describe, expect, it } from 'vitest';
import { validateRiddle, validateSchedule, katexErrors } from './content';
import { loadContent, validateContent } from './contentLoader';
import type { Riddle } from './types';
import bayes from '../content/riddles/bayes-disease-test.json';
import keys from '../content/riddles/keys-no-locks.json';
import widget from '../content/riddles/widget-machines.json';
import coin from '../content/riddles/coin-two-heads.json';

const num = bayes as unknown as Riddle;
const word = keys as unknown as Riddle;
const sims = new Set(['bayes-disease-test', 'birthday-23', 'coin-two-heads']);
const errs = (r: Partial<Riddle>, base: Riddle = num) => validateRiddle({ ...base, ...r } as Riddle, { simIds: sims });

describe('seed validation (§8.3)', () => {
  it('accepts every seed riddle and the schedule', () => {
    const { errors } = validateContent(loadContent());
    expect(errors).toEqual([]);
  });

  it('rejects a tier / time limit mismatch', () => {
    expect(errs({ time_limit_s: 30 }).join()).toMatch(/needs time_limit_s 60/);
  });

  it('rejects number riddles missing fields', () => {
    expect(errs({ number_format: null }).join()).toMatch(/number_format/);
    expect(errs({ answer_value: null }).join()).toMatch(/answer_value/);
    expect(errs({ trap_value: undefined }).join()).toMatch(/trap_value/);
    expect(errs({ closeness_cap: null }).join()).toMatch(/closeness_cap/);
  });

  it('rejects quantity values that are not positive', () => {
    expect(errs({ trap_value: 0 }, widget as unknown as Riddle).join()).toMatch(/trap_value must be > 0/);
    expect(errs({ answer_value: -5 }, widget as unknown as Riddle).join()).toMatch(/answer_value must be > 0/);
  });

  it('rejects a trap close enough to score Genius', () => {
    expect(errs({ trap_value: 12 }).join()).toMatch(/trap is too close/);
    // The coin riddle needs its tight 0.5-decade cap: with the default 2 it would fail.
    expect(errs({ closeness_cap: 2 }, coin as unknown as Riddle).join()).toMatch(/trap is too close/);
  });

  it('rejects word riddles without accepted or trap answers, or with overlap', () => {
    expect(errs({ accepted_answers: [] }, word).join()).toMatch(/at least 1 accepted/);
    expect(errs({ trap_answers: [] }, word).join()).toMatch(/at least 1 trap/);
    expect(errs({ trap_answers: ['The Pianos'] }, word).join()).toMatch(/both accepted and a trap/);
  });

  it('rejects probability riddles without a sim or not verified', () => {
    expect(validateRiddle({ ...num, id: 'new-prob' }, { simIds: sims }).join()).toMatch(/needs content\/sims\/new-prob\.ts/);
    expect(errs({ verified: false }).join()).toMatch(/must be verified/);
  });

  it('rejects broken LaTeX', () => {
    expect(katexErrors('$$\\frac{1}{$$').length).toBe(1);
    expect(errs({ explain_math_md: '$\\frac{1}{2$' }).join()).toMatch(/KaTeX error/);
  });

  it('rejects bad schedules', () => {
    const riddles = new Map(loadContent().riddles.map(({ riddle }) => [riddle.id, riddle]));
    const ok = { warmup: 'keys-no-locks', trap: 'bayes-disease-test', boss: 'coin-two-heads' };
    expect(validateSchedule({ '2026-10-01': ok }, riddles)).toEqual([]);
    expect(validateSchedule({ '2026-10-01': { ...ok, boss: 'nope' } }, riddles).join()).toMatch(/unknown riddle/);
    expect(validateSchedule({ '2026-10-01': { ...ok, trap: 'rope-around-earth' } }, riddles).join()).toMatch(/boss riddle in the trap slot/);
    expect(validateSchedule({ '2026-10-01': { ...ok, warmup: 'bayes-disease-test' } }, riddles).join()).toMatch(/trap riddle in the warmup slot/);
    expect(validateSchedule({ '2026-10-01': { ...ok, trap: 'keys-no-locks' } }, riddles).join()).toMatch(/trap slot must be a number riddle/);
    expect(validateSchedule({ '2026-10-01': ok, '2026-12-01': ok }, riddles).join()).toMatch(/repeats within 180 days/);
    expect(validateSchedule({ '2026-10-01': ok, '2027-06-01': ok }, riddles)).toEqual([]);
    expect(validateSchedule({ '2026-10-01': { warmup: 'keys-no-locks', trap: 'bayes-disease-test' } as never }, riddles).join()).toMatch(/missing boss/);
  });
});
