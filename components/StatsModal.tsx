'use client';
import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Sprite } from './Sprite';
import { api } from '@/lib/client';
import { LEVEL_SPRITE } from '@/lib/sprites';
import type { StatsPayload } from '@/lib/types';
import { topPercent } from '@/lib/earlyEstimate';

function PercentileChart({ points }: { points: StatsPayload['lastPercentiles'] }) {
  const W = 560;
  const H = 180;
  const pad = { l: 44, r: 12, t: 12, b: 28 };
  const lo = 0;
  const hi = 100;
  const n = Math.max(points.length, 2);
  const x = (i: number) => Math.round(pad.l + (i * (W - pad.l - pad.r)) / (n - 1));
  const y = (v: number) => Math.round(pad.t + ((hi - v) * (H - pad.t - pad.b)) / (hi - lo));
  // Break the line at days with fewer than 30 players (no stored percentile).
  const segments: { i: number; v: number }[][] = [];
  let cur: { i: number; v: number }[] = [];
  points.forEach((p, i) => {
    if (p.percentile === null) {
      if (cur.length) segments.push(cur);
      cur = [];
    } else cur.push({ i, v: p.percentile });
  });
  if (cur.length) segments.push(cur);
  const label = points.length
    ? `Share of players you beat, last ${points.length} days: ${points.map((p) => (p.percentile === null ? 'none' : `${p.percentile}%`)).join(', ')}`
    : 'No results yet';

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label} shapeRendering="crispEdges" style={{ minWidth: 320 }}>
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--divider)" strokeWidth={2} strokeDasharray="4 4" />
            <text x={pad.l - 8} y={y(v) + 6} textAnchor="end" fill="var(--haze)" style={{ font: '18px var(--font-body)' }}>
              {v}%
            </text>
          </g>
        ))}
        {segments.map((s, k) => (
          <polyline key={k} fill="none" stroke="var(--accent-text)" strokeWidth={2} points={s.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')} />
        ))}
        {points.map((p, i) =>
          p.percentile === null ? (
            <rect key={i} x={x(i) - 3} y={H - pad.b - 6} width={6} height={6} fill="var(--divider)" />
          ) : (
            <rect key={i} x={x(i) - 4} y={y(p.percentile) - 4} width={8} height={8} fill="var(--accent-text)" />
          ),
        )}
      </svg>
    </div>
  );
}

export function StatsModal({ onClose }: { onClose: () => void }) {
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<StatsPayload>('/api/stats').then(setStats, (e: Error) => setError(e.message));
  }, []);

  const cells: [string, string][] = stats
    ? [
        ['Games played', String(stats.gamesPlayed)],
        ['Current streak', String(stats.currentStreak)],
        ['Max streak', String(stats.maxStreak)],
        ['Trap resistance', stats.trapResistance === null ? '–' : `${Math.round(stats.trapResistance * 100)}%`],
        ['Average result', stats.averagePercentile === null ? '–' : `Top ${topPercent(stats.averagePercentile)}%`],
      ]
    : [];

  return (
    <Modal title="Your stats" onClose={onClose}>
      {error && <p className="text-flare-text">{error}</p>}
      {!stats && !error && <p className="text-haze">Loading…</p>}
      {stats && (
        <div className="flex flex-col gap-5">
          <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {cells.map(([k, v]) => (
              <div key={k} className="card flex flex-col gap-2 p-3">
                <dt className="text-[18px] leading-none text-haze">{k}</dt>
                <dd className="pixel m-0 text-[13px]">{v}</dd>
              </div>
            ))}
            <div className="card flex flex-col gap-2 p-3">
              <dt className="text-[18px] leading-none text-haze">Best level</dt>
              <dd className="m-0 flex items-center gap-2">
                {stats.bestLevel && <Sprite rows={LEVEL_SPRITE[stats.bestLevel]} scale={2} />}
                <span className="pixel text-[10px]">{stats.bestLevel ?? '–'}</span>
              </dd>
            </div>
          </dl>
          <div>
            <h3 className="m-0 mb-2 text-[20px] font-normal">Players you beat, last 14 days</h3>
            {stats.lastPercentiles.length ? <PercentileChart points={stats.lastPercentiles} /> : <p className="m-0 text-haze">Finish a climb to start your chart.</p>}
            <p className="mt-2 mb-0 text-[18px] leading-[1.3] text-haze">Gaps are days with fewer than 30 players when you finished.</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
