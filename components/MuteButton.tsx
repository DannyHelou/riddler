'use client';
import { useSyncExternalStore } from 'react';
import { isMuted, setMuted, subscribeMuted, unlockAudio } from '@/lib/sfx';
import { SPEAKER_OFF, SPEAKER_ON } from '@/lib/sprites';
import { Sprite } from './Sprite';

/** Sound toggle (§6.8). Shared by the site header and the climb HUD; remembered per device. */
export function MuteButton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => false);
  return (
    <button
      type="button"
      aria-label="Mute sound"
      aria-pressed={muted}
      title={muted ? 'Sound off' : 'Sound on'}
      className={`flex h-11 w-11 cursor-pointer items-center justify-center border-0 bg-transparent p-0 opacity-60 hover:opacity-100 focus-visible:opacity-100 ${className ?? ''}`}
      style={style}
      onClick={() => {
        unlockAudio();
        setMuted(!muted);
      }}
    >
      <Sprite rows={muted ? SPEAKER_OFF : SPEAKER_ON} scale={2} />
    </button>
  );
}
