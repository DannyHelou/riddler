import Link from 'next/link';
import { deviceId } from '@/lib/api';
import { currentStreak, getToday, GameError } from '@/lib/game';
import { Countdown } from '@/components/Countdown';
import { HomeChrome } from '@/components/HomeChrome';
import { HomeHowTo } from '@/components/HomeHowTo';
import { HomeSky } from '@/components/HomeSky';
import { SiteModals } from '@/components/SiteModals';
import { Sprite } from '@/components/Sprite';
import { StartButton } from '@/components/StartButton';
import { TrackOnMount } from '@/components/TrackOnMount';
import type { TodayState } from '@/lib/types';

export const dynamic = 'force-dynamic';

const UP = ['...ww...', '..wwww..', '.wwwwww.', 'wwwwwwww'];

/**
 * The homepage (§5.2): one full-screen pixel scene, no site header or footer. The title sits
 * in the sky, the balloon waits at the horizon, and the start button rests on the sea.
 */
export default async function HomePage() {
  const id = await deviceId();
  const streak = await currentStreak(id);
  let today: TodayState | null = null;
  let unavailable: string | null = null;
  try {
    if (id) today = await getToday(id);
  } catch (e) {
    unavailable = e instanceof GameError ? e.message : 'Something went wrong. Try again in a moment.';
  }
  const label = today ? (today.puzzleNumber >= 1 ? `Puzzle #${today.puzzleNumber}` : 'Preview') : null;
  const cta =
    today?.status === 'finished'
      ? { href: '/results', text: 'See your results' }
      : today?.status === 'in_progress'
        ? { href: '/play', text: 'Continue the climb' }
        : { href: '/play', text: 'Start the climb' };

  return (
    <div className="night-scope home relative overflow-hidden">
      {today && <TrackOnMount event="visit_home" props={{ puzzleNumber: today.puzzleNumber, status: today.status }} />}
      <HomeSky />
      <HomeChrome />

      <main id="main" className="relative z-10 min-h-[inherit]">
        <div className="home-titles absolute right-0 left-0 flex flex-col items-center px-4 text-center">
          <h1 className="home-title m-0 font-normal">
            <span aria-hidden="true" className="home-title-ghost home-title-pink">Riddler</span>
            <span aria-hidden="true" className="home-title-ghost home-title-cyan">Riddler</span>
            <span className="relative">Riddler</span>
          </h1>
          <p className="home-subtitle m-0">The daily climb</p>
          <p className="home-tagline m-0">3 riddles · the closer you are, the higher you climb</p>
        </div>

        <div className="home-bottom absolute right-0 bottom-0 left-0 flex flex-col items-center px-4">
          <div className="flex w-full max-w-[560px] flex-col">
            <HomeHowTo />
            {unavailable ? (
              <p className="home-unavailable m-0 my-3 px-4 py-4 text-center text-[22px] text-[#F0B45A]">{unavailable}</p>
            ) : (
              <StartButton href={cta.href} text={cta.text} className="home-start-hit">
                <span className="home-start">
                  <Sprite rows={UP} scale={2} />
                  <span>{cta.text}</span>
                  <Sprite rows={UP} scale={2} />
                </span>
              </StartButton>
            )}
            {/* Only what's worth a glance: which puzzle, a streak once you have one, and the countdown once today is done. */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <span className="home-meta">
                {label}
                {streak > 0 ? ` · Streak ${streak}` : ''}
                {today?.status === 'finished' && (
                  <>
                    {' · '}
                    <Countdown to={today.nextResetAt} label="Next climb in" className="inline" />
                  </>
                )}
              </span>
              <Link href="/privacy" className="home-meta home-meta-link">Privacy</Link>
            </div>
          </div>
        </div>
      </main>
      <SiteModals />
    </div>
  );
}
