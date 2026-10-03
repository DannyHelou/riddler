'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { crossFadeToClimb } from '@/lib/launch';
import { sfx, unlockAudio } from '@/lib/sfx';

const HANDOFF_MS = 700;

/**
 * The homepage's primary button (§5.2). For the climb it plays a short eased handoff: the
 * text fades and the camera pans until the balloon, still on its launch pad, sits where the
 * climb's Balloon shot puts it; then the page cross-fades into the climb's first frame. The
 * play is created in the background and /play is already prefetched. Still a real link, so
 * middle-click and no-JS keep working.
 */
export function StartButton({ href, text, className, children }: { href: string; text: string; className: string; children?: React.ReactNode }) {
  const router = useRouter();
  const [launching, setLaunching] = useState(false);
  const toClimb = href === '/play';

  useEffect(() => {
    if (toClimb) router.prefetch('/play');
    return () => {
      delete document.documentElement.dataset.launch;
      document.documentElement.style.removeProperty('--launch-shift');
    };
  }, [router, toClimb]);

  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        unlockAudio();
        sfx.click();
        if (!toClimb || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        if (launching) return;
        void api('/api/play/start', {}).catch(() => {
          /* the climb retries on boot */
        });
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          router.push('/play');
          return;
        }
        // Pan so the balloon lands where the climb opens: centered in a viewport at least 520 px tall.
        const root = document.documentElement;
        const pad = document.querySelector<HTMLElement>('.home-balloon')?.getBoundingClientRect();
        if (pad) {
          const target = Math.round(Math.max(window.innerHeight, 520) / 2 - pad.height / 2);
          root.style.setProperty('--launch-shift', `${Math.round(target - pad.top)}px`);
        }
        root.dataset.launch = '1';
        setLaunching(true);
        setTimeout(() => crossFadeToClimb(() => router.push('/play')), HANDOFF_MS);
      }}
    >
      {children ?? text}
    </Link>
  );
}
