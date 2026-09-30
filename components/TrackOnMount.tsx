'use client';
import { useEffect } from 'react';
import { track, type EventName } from '@/lib/track';

export function TrackOnMount({ event, props }: { event: EventName; props?: Record<string, string | number | boolean | null> }) {
  useEffect(() => {
    track(event, props);
    // Fire once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
