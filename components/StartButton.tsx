'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { sfx, unlockAudio } from '@/lib/sfx';

const HANDOFF_MS = 600;

/**
 * The homepage's primary button (§5.2). For the climb it plays a short stepped handoff:
 * the sky balloon rises along its path while the page steps to the climb's sea-level sky,
 * the play is created in the background, and /play is already prefetched. Still a real
 * link, so middle-click and no-JS keep working.
 */
export function StartButton({ href, text, className, children }: { href: string; text: string; className: string; children?: React.ReactNode }) {
  const router = useRouter();
  const [launching, setLaunching] = useState(false);
  const toClimb = href === '/play';

  useEffect(() => {
    if (toClimb) router.prefetch('/play');
    return () => {
      delete document.documentElement.dataset.launch;
    };
  }, [router, toClimb]);

  return (
    <>
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
          document.documentElement.dataset.launch = '1';
          setLaunching(true);
          setTimeout(() => router.push('/play'), HANDOFF_MS);
        }}
      >
        {children ?? text}
      </Link>
      {launching && <div aria-hidden="true" className="launch-curtain pointer-events-none fixed inset-0 z-50" style={{ background: '#24457A' }} />}
    </>
  );
}
