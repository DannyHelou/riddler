'use client';
import { useEffect } from 'react';
import { track, type EventName } from '@/lib/track';
import { sourceProps } from '@/lib/source';

export function TrackOnMount({ event, props }: { event: EventName; props?: Record<string, string | number | boolean | null> }) {
  useEffect(() => {
    // Homepage visits also record where the visitor came from (referring host + UTM tags).
    track(event, event === 'visit_home' ? { ...props, ...sourceProps(document.referrer, location.search, location.hostname) } : props);
    // Fire once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
