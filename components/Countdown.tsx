'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { countdown } from '@/lib/format';

/** "Next riddles in 07:12:44". Refreshes the page when the new set unlocks. */
export function Countdown({ to, label, className }: { to: string; label: string; className?: string }) {
  const router = useRouter();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= Date.parse(to)) {
        clearInterval(id);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [to, router]);
  return (
    <div className={className}>
      {label} <span suppressHydrationWarning>{now === null ? '--:--:--' : countdown(Date.parse(to) - now)}</span>
    </div>
  );
}
