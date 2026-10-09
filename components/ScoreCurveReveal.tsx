'use client';
import { useEffect, useState } from 'react';
import { Sprite } from './Sprite';
import { MINI_BALLOON } from '@/lib/sprites';
import { CURVE_COLUMNS, SCORE_MAX, scoreColumn, topPercent } from '@/lib/earlyEstimate';

/**
 * Result reveal (§5.5, owner decision 2026-10-09): a pixel curve of how today's scores spread
 * over 0–450 builds column by column (~1 s), a small balloon drops onto the player's score,
 * and "Top N%" counts down from 100%.
 */
export function ScoreCurveReveal({
  curve,
  score,
  percentile,
  estimated,
  puzzleLabel,
  phone,
}: {
  curve: number[];
  score: number;
  percentile: number;
  /** Fewer than 30 players today: an early estimate (lib/earlyEstimate.ts), so no "% of players" claim. */
  estimated: boolean;
  puzzleLabel: string;
  phone: boolean;
}) {
  const top = topPercent(percentile);
  const you = scoreColumn(score);
  const caption = estimated ? 'Early estimate · updates as people play' : `Better than ${Math.round(percentile)}% of players today`;
  const [built, setBuilt] = useState(0);
  const [drop, setDrop] = useState(0); // 0..1
  const [shown, setShown] = useState(100);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setBuilt(CURVE_COLUMNS);
      setDrop(1);
      setShown(top);
      setDone(true);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = now - start;
      setBuilt(Math.min(CURVE_COLUMNS, Math.floor(t / 22) + 1)); // 45 columns in 1 s
      const d = Math.max(0, Math.min(1, (t - 1000) / 450));
      setDrop(d * d);
      const k = Math.max(0, Math.min(1, (t - 1000) / 900));
      setShown(Math.round(100 - (100 - top) * (1 - Math.pow(1 - k, 3))));
      if (t < 2000) raf = requestAnimationFrame(step);
      else setDone(true);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [top]);

  // Peak 90 px on desktop, 60 px on phones (so the first screen fits the landed balloon); 2 px grid.
  const peak = phone ? 60 : 90;
  const barH = (i: number) => 2 * Math.max(1, Math.round(((curve[i] ?? 0) * peak) / 2));
  const labels = phone ? [0, 150, 300, 450] : [0, 75, 150, 225, 300, 375, 450];

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-2 md:gap-3">
        <div className="eyebrow eyebrow-fit">{puzzleLabel} · Your result</div>
        <div className="panel-title text-[40px] leading-none md:text-[80px]" aria-hidden="true">
          Top {shown}%
        </div>
        <div className="text-[20px] leading-none md:text-[26px]" style={{ visibility: done ? 'visible' : 'hidden' }} aria-hidden="true">
          {caption}
        </div>
        <p className="sr-only" aria-live="polite">
          {done ? `Top ${top}%. ${estimated ? 'Early estimate, updates as people play' : caption}.` : ''}
        </p>
      </div>
      <div className="card flex flex-col gap-2 px-4 pt-3 pb-3 md:px-5 md:pt-5 md:pb-4">
        <div
          role="img"
          aria-label={`Curve of ${estimated ? 'estimated ' : ''}scores today from 0 to ${SCORE_MAX}, with your score of ${score} marked`}
          className="flex items-end gap-[2px]"
          style={{ height: peak + (phone ? 24 : 56), borderBottom: '2px solid var(--line)' }}
        >
          {Array.from({ length: CURVE_COLUMNS }, (_, i) => {
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
        <div className="text-center text-[16px] leading-none text-haze md:text-[18px]" aria-hidden="true">
          Score for the day
        </div>
      </div>
    </div>
  );
}
