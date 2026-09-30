'use client';
/**
 * Results and debrief (§5.5): the only place comparative stats appear.
 * Percentile and RQ are live: re-fetched every time this page opens (§4.7).
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/client';
import { takeResults } from '@/lib/resultsCache';
import { track } from '@/lib/track';
import { fmtAlt } from '@/lib/format';
import { LEVEL_SPRITE, SPRITES } from '@/lib/sprites';
import { BellCurveReveal } from './BellCurveReveal';
import { Countdown } from './Countdown';
import { DebriefCard } from './Debrief';
import { Sprite } from './Sprite';
import { DuskSky, LandedScene } from './HomeSky';
import type { ResultsPayload } from '@/lib/types';
import { TIER_NAME } from '@/lib/types';

function rowSprite(r: ResultsPayload['perRiddle'][number]) {
  if (r.trapped) return SPRITES.verdicts.trap;
  if (r.answerType === 'word') return r.verdict === 'correct' ? SPRITES.verdicts.check : SPRITES.verdicts.wrong;
  return LEVEL_SPRITE[r.ladderLevel ?? 'Goldfish'];
}

function rowDetail(r: ResultsPayload['perRiddle'][number]) {
  const parts: string[] = [];
  if (r.verdict === 'timeout') parts.push('Out of time');
  else if (r.answerType === 'word') parts.push(r.verdict === 'correct' ? 'Correct' : r.verdict === 'trapped' ? 'Trapped' : 'Wrong');
  else parts.push(r.trapped ? `${r.ladderLevel}, trapped` : (r.ladderLevel ?? 'Goldfish'));
  if (r.timeBonus >= 25) parts.push('speed bonus');
  return parts.join(', ');
}

function ShareButton({ text }: { text: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const share = async () => {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (coarse && navigator.share) {
      try {
        await navigator.share({ text });
        track('share_clicked', { method: 'native' });
        return;
      } catch {
        /* cancelled: fall back to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setMsg('Copied. Paste it in your group chat.');
      track('share_clicked', { method: 'clipboard' });
    } catch {
      setMsg('Copy this: ' + text);
      track('share_clicked', { method: 'manual' });
    }
  };
  return (
    <div className="flex flex-col">
      <button type="button" className="btn-primary" onClick={() => void share()}>
        Share result
      </button>
      <p className="m-0 text-center text-[18px] text-haze" role="status">
        {msg}
      </p>
    </div>
  );
}

function ScoreCard({ r }: { r: ResultsPayload }) {
  return (
    <div className="card flex flex-col gap-2 px-4 py-3 md:gap-3 md:px-6 md:py-4">
      <div className="flex items-baseline justify-between">
        <h2 className="eyebrow m-0 font-normal">Score</h2>
        <div className="panel-title text-[30px] leading-none md:text-[34px]">
          {r.totalScore} <span className="text-haze">/ {r.maxScore}</span>
        </div>
      </div>
      {r.perRiddle.map((row) => (
        <div key={row.slot} className="dash-top flex items-center gap-3 pt-2 md:pt-3">
          <Sprite rows={rowSprite(row)} scale={3} />
          {/* Phones: name and detail share a line (wrapping if long) so the first screen fits. */}
          <div className="flex flex-1 flex-wrap items-baseline gap-x-2 gap-y-1 md:flex-col md:items-start">
            <div className="text-[20px] leading-none">{TIER_NAME[row.tier]}</div>
            <div className="text-[16px] leading-none text-haze md:text-[18px]">{rowDetail(row)}</div>
          </div>
          <div className="pixel text-[10px] leading-none text-haze">+{row.points}</div>
        </div>
      ))}
      <div className="dash-top pt-2 text-[16px] leading-none text-haze md:pt-3 md:text-[18px]">You reached {fmtAlt(r.altitude)}</div>
    </div>
  );
}

export function Results() {
  const [r, setR] = useState<ResultsPayload | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [phone, setPhone] = useState(false);

  useEffect(() => {
    setPhone(window.innerWidth < 768);
    takeResults().then(
      (res) => {
        setR(res);
        try {
          const k = `burner_finished_${res.puzzleDate}`;
          if (!sessionStorage.getItem(k) && !localStorage.getItem(k)) {
            localStorage.setItem(k, '1');
            track('play_finished', { totalScore: res.totalScore, percentile: res.percentile === null ? null : Math.round(res.percentile), rq: res.rq });
          }
        } catch {
          /* ignore */
        }
      },
      (e) => setError({ status: e instanceof ApiError ? e.status : 500, message: e instanceof Error ? e.message : 'Something went wrong' }),
    );
  }, []);

  if (error) {
    return (
      <div className="mx-auto flex max-w-[640px] flex-col items-start gap-5 px-4 py-16">
        <h1 className="pixel m-0 text-[14px] leading-[1.6]">{error.status === 403 || error.status === 409 ? 'Land first' : 'Something went wrong'}</h1>
        <p className="m-0 text-[22px] text-haze">{error.status === 403 || error.status === 409 ? "Your results appear once you've finished today's climb." : error.message}</p>
        <Link href="/play" className="btn-primary px-8">
          {error.status === 403 ? 'Continue the climb' : 'Start the climb'}
        </Link>
      </div>
    );
  }
  // While the results load, hold the climb's closing dusk (no text) so the landing fades straight in.
  if (!r)
    return (
      <div className="min-h-[calc(100dvh-56px)] md:min-h-[calc(100dvh-64px)]" style={{ background: '#070B1C' }} aria-busy="true">
        <span className="sr-only">Landing…</span>
      </div>
    );

  const puzzleLabel = r.puzzleNumber >= 1 ? `Puzzle ${r.puzzleNumber}` : 'Preview';

  const toExplanations = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('riddle-by-riddle')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <div>
      {/* You've landed: your result fills the first screen under the start page's dusk sky, with the
          fairground along the bottom and your balloon back on its pad. The explanations wait below (§5.5). */}
      <section className="night-scope landed-in relative flex min-h-[calc(100dvh-56px)] flex-col overflow-hidden md:min-h-[calc(100dvh-64px)]" style={{ background: '#070B1C' }} aria-label="Your result">
        <DuskSky moonClass="hidden md:block" />
        <div className="landed-strip pointer-events-none absolute right-0 bottom-0 left-0">
          <LandedScene />
        </div>
        <div className="relative z-10 mx-auto grid w-full max-w-[1240px] flex-1 grid-cols-1 content-center items-center gap-3 px-4 pt-2 pb-2 md:gap-8 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] md:gap-x-20 md:gap-y-4 md:px-12 md:pt-4">
          <div>
            {r.coldStart ? (
              <div className="flex flex-col gap-3 md:gap-5">
                <div className="eyebrow eyebrow-fit">{puzzleLabel} · Your riddle quotient</div>
                <h1 className="panel-title m-0 text-[40px] leading-none font-normal md:text-[72px]">Early bird</h1>
                <div className="flex flex-col gap-2 md:gap-3">
                  <p className="m-0 max-w-[34ch] text-[20px] leading-[1.3] md:text-[26px]">
                    You&apos;re one of the first {r.n} {r.n === 1 ? 'player' : 'players'} today. Your RQ appears once 30 people have played.
                  </p>
                  <p className="m-0 hidden max-w-[40ch] text-[18px] leading-[1.3] text-haze md:block">Come back later today: this page updates as more people land.</p>
                </div>
              </div>
            ) : (
              <BellCurveReveal rq={r.rq!} percentile={r.percentile!} puzzleLabel={puzzleLabel} phone={phone} />
            )}
          </div>
          <div className="flex flex-col justify-center gap-3 md:gap-4">
            <ScoreCard r={r} />
            <ShareButton text={r.shareText} />
            <Countdown to={r.nextResetAt} label="Next climb in" className="text-center text-[18px] leading-none text-haze" />
            <button type="button" onClick={toExplanations} className="panel-note link-button cursor-pointer self-center px-4 hover:text-moonlight" style={{ textDecoration: 'none', color: '#C9D3FF', minHeight: 32 }}>
              ▼ See how everyone did, and why ▼
            </button>
          </div>
        </div>
        {/* Room for the fairground and the parked balloon. */}
        <div className="landed-spacer relative" aria-hidden="true" />
      </section>

      <section aria-labelledby="riddle-by-riddle">
        <div className="mx-auto flex max-w-[1240px] scroll-mt-4 flex-col gap-5 px-4 pt-10 pb-10 md:gap-6 md:px-12 md:pb-14">
          <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
            <h2 id="riddle-by-riddle" className="panel-title m-0 scroll-mt-6 text-[30px] leading-none font-normal md:text-[36px]">Riddle by riddle</h2>
            <div className="hidden text-[18px] leading-none text-haze md:block">How everyone else answered, and why</div>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
            {r.debrief.map((d) => (
              <DebriefCard key={d.slot} d={d} coldStart={r.coldStart} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
