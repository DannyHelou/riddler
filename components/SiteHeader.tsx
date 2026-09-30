'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sprite } from './Sprite';
import { SiteModals } from './SiteModals';
import { MuteButton } from './MuteButton';
import { MINI_BALLOON, SPRITES } from '@/lib/sprites';
import { openModal } from '@/lib/modals';

export function ThemeToggle() {
  const [light, setLight] = useState(false);
  useEffect(() => setLight(document.documentElement.dataset.theme === 'light'), []);
  const flip = () => {
    const next = !light;
    setLight(next);
    if (next) document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem('burner_theme', next ? 'light' : 'dark');
    } catch {
      /* ignore */
    }
  };
  return (
    <button type="button" className="link-button text-[inherit] no-underline hover:text-moonlight" style={{ minHeight: 0, textDecoration: 'none' }} onClick={flip} aria-pressed={light}>
      {light ? 'Dark theme' : 'Light theme'}
    </button>
  );
}

export function SiteHeader({ streak }: { streak: number }) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [path]);

  // Opening a modal closes the phone menu; the modals themselves live in SiteModals.
  useEffect(() => {
    const on = () => setMenu(false);
    window.addEventListener('burner:modal', on);
    return () => window.removeEventListener('burner:modal', on);
  }, []);

  // The wordmark is the way home; the nav stays quiet (§5.2).
  const navItem = 'no-underline';
  const links = (
    <>
      <button type="button" className={`link-button ${navItem}`} style={{ textDecoration: 'none', minHeight: 0 }} onClick={() => openModal('how')}>How to play</button>
      <button type="button" className={`link-button ${navItem}`} style={{ textDecoration: 'none', minHeight: 0 }} onClick={() => openModal('stats')}>Stats</button>
      <Link href="/about" className={navItem} aria-current={path === '/about' ? 'page' : undefined}>About</Link>
    </>
  );

  return (
    <header className="relative">
      <div className="mx-auto flex h-14 max-w-[1040px] items-center justify-between px-4 md:h-16 md:px-10">
        <Link href="/" className="flex items-center gap-[10px] no-underline" aria-label="Riddler, home">
          <Sprite rows={MINI_BALLOON} scale={2} />
          <span className="pixel text-[11px] leading-none md:text-[12px]">Riddler</span>
        </Link>

        <div className="flex items-center gap-2 md:gap-7">
          <nav aria-label="Main" className="hidden items-center gap-7 text-[20px] text-haze md:flex">{links}</nav>
          {streak > 0 && (
            <div className="flex items-center gap-[6px]" aria-label={`${streak}-day streak`} role="img">
              <Sprite rows={SPRITES.ui.flame_streak} scale={2} />
              <span className="text-[20px] leading-none text-haze" aria-hidden="true">{streak}</span>
            </div>
          )}
          <MuteButton />
          <button
            type="button"
            className="flex h-11 w-11 cursor-pointer flex-col items-center justify-center gap-[5px] border-0 bg-transparent md:hidden"
            aria-label={menu ? 'Close menu' : 'Open menu'}
            aria-expanded={menu}
            aria-controls="mobile-menu"
            onClick={() => setMenu((m) => !m)}
          >
            <span className="h-[2px] w-5 bg-haze" />
            <span className="h-[2px] w-5 bg-haze" />
            <span className="h-[2px] w-5 bg-haze" />
          </button>
        </div>
      </div>
      {menu && (
        <nav id="mobile-menu" aria-label="Main" className="absolute top-full right-0 left-0 z-40 flex flex-col items-start gap-3 border-b-2 border-rule bg-night px-4 py-4 text-[22px] text-haze md:hidden">
          {links}
          <ThemeToggle />
        </nav>
      )}
      <SiteModals />
    </header>
  );
}
