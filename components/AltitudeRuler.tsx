'use client';
/**
 * The altitude ruler (§5.3): a thin scale on the right edge that tracks your whole climb.
 * Checkpoints (records, air-pressure facts, the edge of space) sit on it; each answer's
 * stretch is tinted with its closeness color; a cyan YOU marker rides your altitude. During a
 * burn, a marker for each closeness level you pass is added alongside the checkpoints.
 * Heights beyond the day's maximum are listed above the top.
 *
 * Static parts render with React; the rAF loop in Climb calls `update` every frame to move
 * the marker and grow the live stretch during a burn, without re-rendering.
 */
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { WORLD } from '@/lib/sprites';

export const RULER_MAX_M = 115_000; // the best possible day reaches 112.5 km (§4.9)
const YOU = '#4CC6E6';
const LINE = '#1A2240';
const DIM = '#323A5C';
const PASSED = '#5B6488';
const NEXT = '#8C95B8';

export interface RulerSegment {
  from: number;
  to: number;
  color: string;
}

export interface RulerHandle {
  /** Move the YOU marker to `cur`; while burning, draw the live stretch from `from` in `color`. */
  update: (cur: number, live: { from: number; color: string } | null) => void;
  /** Mark a closeness level passed at altitude `alt` (the tier ladder, §5.4). */
  tier: (alt: number, name: string, color: string, final: boolean) => void;
  /** Remove the tier marks (a new riddle starts). */
  clearTiers: () => void;
}

export interface RulerGeometry {
  full: boolean; // labels and checkpoint names (wide screens); otherwise a thin strip
  lineX: number; // x of the ruler line, from the left edge of the screen
  top: number;
  bottom: number;
}

export function rulerGeometry(W: number, H: number): RulerGeometry {
  const full = W >= 1100;
  // Close to the edge and most of the height: it is there when you look, not asking to be read.
  return full ? { full, lineX: W - 22, top: 104, bottom: H - 28 } : { full, lineX: W - 6, top: 72, bottom: H - 12 };
}

export function rulerY(g: RulerGeometry, altitudeM: number): number {
  const k = Math.sqrt(Math.max(0, Math.min(RULER_MAX_M, altitudeM)) / RULER_MAX_M);
  return g.bottom - (g.bottom - g.top) * k;
}

export const AltitudeRuler = forwardRef<RulerHandle, { g: RulerGeometry; segments: RulerSegment[]; startAlt: number }>(function AltitudeRuler(
  { g, segments, startAlt },
  ref,
) {
  const marker = useRef<HTMLDivElement>(null);
  const live = useRef<HTMLDivElement>(null);
  const names = useRef<(HTMLDivElement | null)[]>([]);
  const lastCur = useRef<number>(-1);
  const tiers = useRef<HTMLDivElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      update(cur, l) {
        const y = rulerY(g, cur);
        if (marker.current) marker.current.style.top = `${y}px`;
        if (live.current) {
          if (l && cur > l.from) {
            const y0 = rulerY(g, l.from);
            live.current.style.visibility = 'visible';
            live.current.style.top = `${y}px`;
            live.current.style.height = `${Math.max(0, y0 - y)}px`;
            live.current.style.background = l.color;
          } else live.current.style.visibility = 'hidden';
        }
        if (Math.round(cur) !== lastCur.current) {
          lastCur.current = Math.round(cur);
          const next = WORLD.checkpoints.findIndex((cp) => cp.altitudeM > cur);
          names.current.forEach((el, i) => {
            if (!el) return;
            const cp = WORLD.checkpoints[i];
            el.style.color = cp.altitudeM <= cur ? PASSED : i === next ? NEXT : DIM;
          });
        }
      },
      tier(alt, name, color, final) {
        const box = tiers.current;
        if (!box) return;
        const y = Math.round(rulerY(g, alt));
        const notch = document.createElement('div');
        notch.className = 'absolute';
        Object.assign(notch.style, { left: `${g.lineX - (g.full ? 9 : 6)}px`, top: `${y - 1}px`, width: `${g.full ? 9 : 6}px`, height: '2px', background: color });
        const label = document.createElement('div');
        label.className = 'pixel tier-pop absolute whitespace-nowrap uppercase';
        label.textContent = name;
        // A checkpoint name it lands on steps aside until the marks clear.
        names.current.forEach((el, i) => {
          if (el && Math.abs(rulerY(g, WORLD.checkpoints[i].altitudeM) - y) < 14) el.style.visibility = 'hidden';
        });
        Object.assign(label.style, {
          right: `calc(100% - ${g.lineX - (g.full ? 12 : 9)}px)`, top: `${y - 7}px`, padding: '2px 3px 2px 5px',
          fontSize: '8px', lineHeight: '10px', letterSpacing: '0.15em', color, background: '#070B18', transformOrigin: 'right center',
          boxShadow: final ? `inset 0 0 0 1px ${color}` : 'none',
        });
        box.append(notch, label);
      },
      clearTiers() {
        if (tiers.current) tiers.current.innerHTML = '';
        names.current.forEach((el) => {
          if (el) el.style.visibility = '';
        });
      },
    }),
    [g],
  );

  // Minor ticks every 16 px along the scale.
  const minor: number[] = [];
  for (let y = g.bottom; y >= g.top; y -= 16) minor.push(y);
  const tickLen = g.full ? 4 : 3;

  return (
    <div aria-hidden="true" className="climb-hud pointer-events-none absolute inset-0 z-[5]">
      {/* Beyond today's reach, listed over the top of the scale. */}
      {g.full &&
        WORLD.beyond.map((b, i) => (
          <div
            key={b.name}
            className="absolute text-right text-[18px] leading-none whitespace-nowrap"
            style={{ right: `calc(100% - ${g.lineX + 2}px)`, top: g.top - 24 - (WORLD.beyond.length - 1 - i) * 20, color: DIM }}
          >
            ↑ {b.name}, {b.label}
          </div>
        ))}

      <div className="absolute" style={{ left: g.lineX - 1, top: g.top, width: 2, height: g.bottom - g.top, background: LINE }} />
      {minor.map((y) => (
        <div key={y} className="absolute" style={{ left: g.lineX - tickLen, top: y - 1, width: tickLen, height: 2, background: LINE }} />
      ))}
      {/* Your climb: one stretch per answer, in its closeness color; the live one grows during a burn. */}
      {segments.map((s, i) => {
        const y1 = rulerY(g, s.to);
        const y0 = rulerY(g, s.from);
        return <div key={i} className="absolute" style={{ left: g.lineX - 1, top: y1, width: 2, height: Math.max(2, y0 - y1), background: s.color, opacity: 0.8 }} />;
      })}
      <div ref={live} className="absolute" style={{ left: g.lineX - 1, width: 2, visibility: 'hidden', opacity: 0.8 }} />

      {/* Checkpoints: a notch on the line, the name to the left on wide screens. */}
      {WORLD.checkpoints.map((cp, i) => {
        const y = rulerY(g, cp.altitudeM);
        return (
          <div key={cp.name}>
            <div className="absolute" style={{ left: g.lineX - (g.full ? 7 : 4), top: y - 1, width: g.full ? 7 : 4, height: 2, background: DIM }} />
            {g.full && (
              <div
                ref={(el) => {
                  names.current[i] = el;
                }}
                className="absolute text-right text-[18px] leading-none whitespace-nowrap"
                style={{ right: `calc(100% - ${g.lineX - 12}px)`, top: y - 9, color: cp.altitudeM <= startAlt ? PASSED : DIM }}
              >
                {cp.name}
              </div>
            )}
          </div>
        );
      })}

      {/* Tier marks for the current answer, added by `tier` during the burn. */}
      <div ref={tiers} />

      {/* YOU: a cyan pointer at your altitude. */}
      {g.full ? (
        <div ref={marker} className="absolute right-0 left-0" style={{ top: rulerY(g, startAlt), height: 0 }}>
          {/* YOU ▶ on the left of the line, pointing at it; its own ground hides the name it passes. */}
          <div className="absolute flex items-center gap-[6px] py-[3px] pl-[6px]" style={{ right: `calc(100% - ${g.lineX - 2}px)`, top: -8, background: '#070B18' }}>
            <span className="pixel text-[8px] leading-none" style={{ color: YOU }}>YOU</span>
            <div className="relative" style={{ width: 6, height: 10 }}>
              <div className="absolute" style={{ left: 0, top: 0, width: 2, height: 10, background: YOU }} />
              <div className="absolute" style={{ left: 2, top: 2, width: 2, height: 6, background: YOU }} />
              <div className="absolute" style={{ left: 4, top: 4, width: 2, height: 2, background: YOU }} />
            </div>
          </div>
        </div>
      ) : (
        <div ref={marker} className="absolute right-0 left-0" style={{ top: rulerY(g, startAlt), height: 0 }}>
          {/* Thin strip: a pixel arrow pointing right, its tip on the line. */}
          <div className="absolute" style={{ left: g.lineX - 8, top: -5, width: 6, height: 10 }}>
            <div className="absolute" style={{ left: 0, top: 0, width: 2, height: 10, background: YOU }} />
            <div className="absolute" style={{ left: 2, top: 2, width: 2, height: 6, background: YOU }} />
            <div className="absolute" style={{ left: 4, top: 4, width: 2, height: 2, background: YOU }} />
          </div>
        </div>
      )}
    </div>
  );
});
