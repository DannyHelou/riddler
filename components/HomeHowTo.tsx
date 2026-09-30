'use client';
import { openModal } from '@/lib/modals';
import { Sprite } from './Sprite';

const ARROW = ['w..', 'ww.', 'www', 'ww.', 'w..'];

/** "▸ How to play" above the start button: opens the site-wide modal. */
export function HomeHowTo() {
  return (
    <button type="button" className="home-link flex items-center gap-[10px]" onClick={() => openModal('how')}>
      <Sprite rows={ARROW} scale={2} style={{ opacity: 0.8 }} />
      How to play
    </button>
  );
}
