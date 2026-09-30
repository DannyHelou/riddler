'use client';
import { useEffect, useState } from 'react';
import { Sprite } from './Sprite';
import { MINI_BALLOON } from '@/lib/sprites';

const COLS = 40;
const MIN = 55;
const MAX = 145;

/** Column index for an RQ on the 55–145 axis (mean 100, 15 per SD, ±3 SD). */
export function rqColumn(rq: number) {
  return Math.min(COLS - 1, Math.max(0, Math.floor(((rq - MIN) / (MAX - MIN)) * COLS)));
}

function blocks(i: number) {
  const z = -3 + ((i + 0.5) * 6) / COLS;
  return Math.max(1, Math.round(Math.exp((-z * z) / 2) * 45));
}

/**
 * RQ reveal (§5.5): the pixel bell curve builds column by column (~1 s), a small
 * balloon drops onto the player's column, and the RQ counts up.
 */
export function BellCurveReveal({ rq, percentile, puzzleLabel, phone }: { rq: number; percentile: number; puzzleLabel: string; phone: boolean }) {
  const you = rqColumn(rq);
  const [built, setBuilt] = useState(0);
  const [drop, setDrop] = useState(0); // 0..1
  const [shown, setShown] = useState(70);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setBuilt(COLS);
      setDrop(1);
      setShown(rq);
      setDone(true);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = now - start;
      setBuilt(Math.min(COLS, Math.floor(t / 25) + 1)); // 40 columns in 1 s
      const d = Math.max(0, Math.min(1, (t - 1000) / 450));
      setDrop(d * d);
      const k = Math.max(0, Math.min(1, (t - 1000) / 900));
      setShown(Math.round(70 + (rq - 70) * (1 - Math.pow(1 - k, 3))));
      if (t < 2000) raf = requestAnimationFrame(step);
      else setDone(true);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [rq]);

  const unit = phone ? 2 : 3;
  // Phones use a flatter curve (peak 60 px, not 90) so the first screen fits the landed balloon.
  const barH = (i: number) => (phone ? 2 * Math.max(1, Math.round(blocks(i) * (2 / 3) / 2)) : blocks(i) * unit);
  const maxH = barH(COLS / 2);
  const labels = phone ? [55, 85, 100, 115, 145] : [55, 70, 85, 100, 115, 130, 145];

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-2 md:gap-3">
        <div className="eyebrow eyebrow-fit">{puzzleLabel} · Your riddle quotient</div>
        <div className="panel-title text-[40px] leading-none md:text-[80px]" aria-hidden="true">
          RQ {shown}
        </div>
        <div className="text-[20px] leading-none md:text-[26px]" style={{ visibility: done ? 'visible' : 'hidden' }} aria-hidden="true">
          Higher than {Math.round(percentile)}% of players today
        </div>
        <p className="sr-only" aria-live="polite">
          {done ? `RQ ${rq}. Higher than ${Math.round(percentile)}% of players today.` : ''}
        </p>
      </div>
      <div className="card flex flex-col gap-2 px-4 pt-3 pb-3 md:px-5 md:pt-5 md:pb-4">
        <div
          role="img"
          aria-label={`Bell curve of today's players with your position at RQ ${rq}`}
          className="flex items-end gap-[2px] md:gap-[3px]"
          style={{ height: maxH + (phone ? 24 : 56), borderBottom: '2px solid var(--line)' }}
        >
          {Array.from({ length: COLS }, (_, i) => {
            const h = barH(i);
            const isYou = i === you;
            return (
              <div key={i} className="flex min-w-0 flex-1 basis-0 flex-col items-center justify-end" style={{ height: '100%', position: 'relative' }}>
                {isYou && drop > 0 && (
                  <div className="absolute" style={{ bottom: h + 6 + Math.round((1 - drop) * 60), left: '50%', transform: 'translateX(-50%)' }}>
                    <Sprite rows={MINI_BALLOON} scale={2} />
                  </div>
                )}
                <div style={{ width: '100%', height: i < built ? h : 0, background: isYou && drop >= 1 ? 'var(--you-text)' : 'var(--divider)' }} />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[18px] leading-none text-haze" aria-hidden="true">
          {labels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
