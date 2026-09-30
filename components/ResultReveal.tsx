'use client';
/**
 * The result card (§5.3 step 4) with a stepped reveal: the level or verdict sprite pops in,
 * the level name dissolves in letter by letter in scrambled order, the points count up,
 * then the details and the button step in. About 500 ms in all; instant under reduced motion.
 * On riddle 3 the card also carries the Landed line and goes straight to the results.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { fmtAlt } from '@/lib/format';
import { LEVEL_SPRITE, SPRITES, type PixelMap } from '@/lib/sprites';
import { Sprite } from './Sprite';
import type { AnswerResult } from '@/lib/types';

const STEP_MS = 40;
const DISSOLVE_STEPS = 12;
const DONE = DISSOLVE_STEPS + 2;

function resultSprite(r: AnswerResult, isNumber: boolean): PixelMap {
  if (r.trapped) return SPRITES.verdicts.trap;
  if (r.timedOut) return SPRITES.verdicts.wrong;
  if (isNumber) return LEVEL_SPRITE[r.ladderLevel ?? 'Goldfish'];
  return r.verdict === 'correct' ? SPRITES.verdicts.check : SPRITES.verdicts.wrong;
}

/** Scrambled but deterministic reveal step (1…6) for each letter. */
const letterStep = (i: number) => ((i * 5 + 3) % DISSOLVE_STEPS) + 1;

interface Props {
  result: AnswerResult;
  headline: string;
  isNumber: boolean;
  color: string;
  phone: boolean;
  final: boolean;
  altitude: number;
  reduced: boolean;
  onNext: () => void;
}

export const ResultReveal = forwardRef<HTMLButtonElement | null, Props>(function ResultReveal(
  { result, headline, isNumber, color, phone, final, altitude, reduced, onNext },
  ref,
) {
  const [step, setStep] = useState(reduced ? DONE : 0);
  const btn = useRef<HTMLButtonElement>(null);
  useImperativeHandle(ref, () => btn.current as HTMLButtonElement, []);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setStep((s) => (s >= DONE ? s : s + 1)), STEP_MS);
    return () => clearInterval(id);
  }, [reduced]);

  const done = step >= DISSOLVE_STEPS;
  useEffect(() => {
    if (done) btn.current?.focus({ preventScroll: true });
  }, [done]);

  const points = Math.round(result.points * Math.min(1, step / DISSOLVE_STEPS));
  const later = { visibility: done ? ('visible' as const) : ('hidden' as const) };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Sprite rows={resultSprite(result, isNumber)} scale={4} className={reduced ? '' : 'pop-in'} />
          <div className="pixel text-[16px] leading-none" style={{ color }}>
            {[...headline].map((ch, i) => (
              <span key={i} style={{ opacity: step >= letterStep(i) ? 1 : 0, transition: 'opacity 200ms ease-out' }}>
                {ch}
              </span>
            ))}
          </div>
        </div>
        <div className="pixel text-[10px] leading-none text-[#9097B4]">+{points} points</div>
      </div>
      <div className={done && !reduced ? 'fade-in flex flex-col gap-3' : 'flex flex-col gap-3'} style={later}>
        <div className="text-[18px] leading-none text-[#9097B4]">
          Climbed {fmtAlt(result.altitudeGain)}
        </div>
        {result.trapped && <div className="text-[20px] leading-none text-[#F0B45A]">You fell for the trap</div>}
        <div className="text-[22px] leading-[1.25]">
          {result.timedOut ? 'Time ran out.' : `You said ${result.yourAnswer}.`} {result.acceptedAs ? 'We accepted it as ' : 'The answer is '}
          <span style={{ color: '#FF3448' }}>{result.answerDisplay}</span>.
        </div>
        {final && (
          <div className="mt-1 flex flex-col gap-2 border-t-2 border-dashed border-[#2C3558] pt-3">
            <div className="pixel text-[11px] leading-[1.4] text-[#F27C9B]">Climb complete</div>
            <div className="text-[20px] leading-[1.25] text-[#9097B4]">You reached {fmtAlt(altitude)}. Explanations and today&apos;s stats are waiting.</div>
          </div>
        )}
        <button
          ref={btn}
          type="button"
          className="btn-primary mt-1"
          style={{ alignSelf: phone ? 'stretch' : 'flex-end' }}
          onClick={onNext}
        >
          {final ? 'See your results' : 'Next riddle'}
          <span className="kbd-hint" aria-hidden="true">
            Enter
          </span>
        </button>
      </div>
    </>
  );
});
