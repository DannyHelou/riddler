'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { parseNumber } from '@/lib/parseNumber';
import { Md } from './Markdown';
import type { ServedRiddle } from '@/lib/types';
import { TIER_COLOR, TIER_NAME } from '@/lib/types';

const YOU = '#4CC6E6';
const LOW = '#F0B45A';
const PILOT = '#4F7FB0';
const DIM = '#1E2A45';

/**
 * Pixel ring for the timer: cells on a 2 px grid around a circle, lit clockwise from the
 * top in proportion to the fuel left. Drawn as one box-shadow, so no rounded corners.
 */
function ringShadow(size: number, fraction: number, lit: string) {
  const cell = 2;
  const n = size / cell;
  const c = (n - 1) / 2;
  const r = c - 1;
  const out: string[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x - c, y - c);
      if (Math.abs(d - r) > 0.6) continue;
      const angle = (Math.atan2(x - c, -(y - c)) + 2 * Math.PI) % (2 * Math.PI);
      const on = angle / (2 * Math.PI) < fraction;
      out.push(`${(x + 1) * cell}px ${(y + 1) * cell}px 0 0 ${on ? lit : DIM}`);
    }
  }
  return out.join(',');
}

/** The timer: a pixel ring with the seconds left, amber (never blinking) for the last 10 seconds. */
export function FuelRing({ remaining, limit, burning = true, size = 48 }: { remaining: number; limit: number; burning?: boolean; size?: number }) {
  const low = burning && remaining <= 10;
  const secs = Math.max(0, Math.min(limit, Math.ceil(remaining)));
  const fraction = Math.max(0, Math.min(1, remaining / limit));
  const color = low ? LOW : burning ? YOU : PILOT;
  return (
    <div role="timer" aria-label={`${secs} seconds left`} aria-live="off" className="relative shrink-0" style={{ width: size, height: size }}>
      <div aria-hidden="true" className="absolute" style={{ left: -2, top: -2, width: 2, height: 2, boxShadow: ringShadow(size, fraction, color) }} />
      <div aria-hidden="true" className={`pixel absolute inset-0 flex items-center justify-center leading-none ${secs >= 100 ? 'text-[8px]' : 'text-[11px]'}`} style={{ color }}>
        {secs}
      </div>
    </div>
  );
}

export interface SignProps {
  riddle: ServedRiddle;
  remaining: number;
  phone: boolean;
  active: boolean; // ask phase: inputs enabled
  igniteIn: number | null; // seconds until the fuel lights (ignite phase), else null
  error: string | null;
  onFire: (input: string) => void;
  onInvalid: (reason: string) => void;
  onEdit: () => void;
  /** Where the two panels sit: the question near the top, the answer bar near the bottom (§5.3). */
  layout: { width: number; left: number; qTop: number; aBottom: number; promptPx: number; pad: string };
}

export function RiddleSign({ riddle, remaining, phone, active, igniteIn, error, onFire, onInvalid, onEdit, layout }: SignProps) {
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const isNumber = riddle.answerType === 'number';
  const isPercent = riddle.numberFormat === 'percent';

  useEffect(() => {
    setValue('');
  }, [riddle.slot]);

  useEffect(() => {
    if (active) input.current?.focus({ preventScroll: true });
  }, [active, riddle.slot]);

  const preview = useMemo(() => {
    if (!isNumber || !value.trim()) return null;
    const p = parseNumber(value, riddle.numberFormat!, riddle.unitLabel);
    return p.ok ? p.reading : null;
  }, [value, isNumber, riddle.numberFormat, riddle.unitLabel]);

  const fire = () => {
    if (!active) return;
    const v = value.trim();
    if (isNumber) {
      const p = parseNumber(v, riddle.numberFormat!, riddle.unitLabel);
      if (!p.ok) return onInvalid(p.reason);
    } else if (!v) {
      return onInvalid('Type an answer');
    }
    onFire(v);
  };

  const burning = igniteIn === null;
  const fraction = Math.max(0, Math.min(1, remaining / riddle.timeLimitS));
  const low = burning && remaining <= 10;
  const unit = isNumber ? (isPercent ? '%' : riddle.unitLabel) : null;
  const placeholder = phone ? (isNumber ? 'a number…' : 'one answer…') : isNumber ? 'type a number…' : 'type one answer…';

  const box = { left: layout.left, width: layout.width, padding: layout.pad };

  return (
    <>
      {/* The question, near the top of the screen. */}
      <section className="panel pointer-events-auto absolute box-border flex flex-col gap-3" style={{ ...box, top: layout.qTop }} aria-label="The riddle">
        <div className="eyebrow flex items-center gap-3">
          <span>Riddle {riddle.slot} of 3</span>
          <span aria-hidden="true" className="h-[6px] w-[6px]" style={{ background: TIER_COLOR[riddle.tier] }} />
          <span style={{ color: '#6F7FA8' }}>{TIER_NAME[riddle.tier]}</span>
        </div>
        <Md className="panel-title leading-[1.15]" style={{ fontSize: layout.promptPx }}>{riddle.promptMd}</Md>
        <div className="panel-note" aria-hidden="true">
          ▼ {isNumber ? 'the closer you are, the higher you climb' : 'one answer, in your own words'} ▼
        </div>
      </section>

    <form
      className="panel pointer-events-auto absolute box-border flex flex-col gap-3"
      style={{ ...box, bottom: layout.aBottom }}
      onSubmit={(e) => {
        e.preventDefault();
        fire();
      }}
      aria-label={`Riddle ${riddle.slot} of 3`}
    >
      {/* The answer bar: fuel ring, answer box with the fuel line under it, fire. */}
      <div className="flex items-center gap-2 md:gap-3">
        <FuelRing remaining={remaining} limit={riddle.timeLimitS} burning={burning} size={phone ? 40 : 48} />
        <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
          <div className="relative">
            <label htmlFor="guess" className="sr-only">
              Your answer
            </label>
            <input
              ref={input}
              id="guess"
              name="guess"
              type="text"
              inputMode={isNumber ? (isPercent ? 'decimal' : 'text') : 'text'}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
              maxLength={40}
              value={value}
              disabled={!active}
              aria-invalid={Boolean(error)}
              aria-describedby="guess-help"
              placeholder={placeholder}
              onChange={(e) => {
                setValue(e.target.value);
                onEdit();
              }}
              className="bar-input box-border w-full"
              style={{ paddingRight: unit ? 14 + unit.length * 11 : 12 }}
            />
            {unit && (
              <div aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[20px] leading-none text-[#9097B4]">
                {unit}
              </div>
            )}
          </div>
          <div aria-hidden="true" className="h-[3px] bg-[#16213A]">
            <div className="h-[3px]" style={{ width: `${fraction * 100}%`, background: low ? LOW : burning ? YOU : PILOT, transition: 'width 250ms linear, background-color 300ms ease' }} />
          </div>
        </div>
        <button type="submit" className="btn-fire" disabled={!active}>
          Fire
        </button>
      </div>

      <div id="guess-help" className="min-h-[18px] text-[18px] leading-none" aria-live="polite">
        {igniteIn !== null ? (
          <span className="text-[#8FB8E0]">The fuel starts in {Math.max(1, igniteIn)}…</span>
        ) : error ? (
          <span style={{ color: LOW }}>{error}</span>
        ) : preview ? (
          <span className="text-[#9097B4]">{preview}</span>
        ) : null}
      </div>
    </form>
    </>
  );
}
