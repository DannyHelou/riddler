'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { MuteButton } from './MuteButton';
import { ThemeToggle } from './SiteHeader';
import { openModal } from '@/lib/modals';

/**
 * The homepage's corner controls (§5.2): a square menu button top-left that opens the site
 * nav (How to play, Stats, About, Privacy, Contact, theme), and sound top-right.
 */
export function HomeChrome() {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const firstItem = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstItem.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onModal = () => setOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('burner:modal', onModal);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('burner:modal', onModal);
    };
  }, [open]);

  const item = 'home-menu-item';
  return (
    <>
      <div ref={wrap} className="home-corner-left absolute z-30">
        <button
          ref={button}
          type="button"
          className="home-icon flex-col gap-[4px]"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="home-menu"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="h-[2px] w-[18px] bg-[#C9D3FF]" />
          <span className="h-[2px] w-[18px] bg-[#C9D3FF]" />
          <span className="h-[2px] w-[18px] bg-[#C9D3FF]" />
        </button>
        {open && (
          <nav id="home-menu" aria-label="Main" className="home-menu panel absolute top-[52px] left-0 flex w-[240px] flex-col px-5 py-4">
            <span className="eyebrow mb-2">Menu</span>
            <button ref={firstItem} type="button" className={item} onClick={() => openModal('how')}>How to play</button>
            <button type="button" className={item} onClick={() => openModal('stats')}>Stats</button>
            <Link href="/about" className={item}>About</Link>
            <Link href="/privacy" className={item}>Privacy</Link>
            <Link href="/contact" className={item}>Contact</Link>
            <div className="dash-top mt-2 pt-2 text-[22px] text-[#9097B4]">
              <ThemeToggle />
            </div>
          </nav>
        )}
      </div>

      <div className="home-corner-right absolute z-30 flex flex-col gap-[6px]">
        <MuteButton className="home-icon" style={{ width: 36, height: 36 }} />
      </div>
    </>
  );
}
