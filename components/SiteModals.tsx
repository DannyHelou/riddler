'use client';
import { useCallback, useEffect, useState } from 'react';
import { HowToPlayModal } from './HowToPlayModal';
import { StatsModal } from './StatsModal';
import type { ModalName } from '@/lib/modals';

const SEEN_KEY = 'burner_seen_how';

/**
 * Owns the site-wide modals (How to play, Stats). Any page opens one with `openModal()`.
 * How to play opens by itself on the first visit (§2.1). Rendered by the site header and
 * by the full-screen homepage.
 */
export function SiteModals() {
  const [modal, setModal] = useState<ModalName | null>(null);
  const close = useCallback(() => setModal(null), []);

  useEffect(() => {
    const on = (e: Event) => setModal((e as CustomEvent<ModalName>).detail);
    window.addEventListener('burner:modal', on);
    try {
      if (!localStorage.getItem(SEEN_KEY)) {
        localStorage.setItem(SEEN_KEY, '1');
        setModal('how');
      }
    } catch {
      /* ignore */
    }
    return () => window.removeEventListener('burner:modal', on);
  }, []);

  if (modal === 'how') return <HowToPlayModal onClose={close} />;
  if (modal === 'stats') return <StatsModal onClose={close} />;
  return null;
}
