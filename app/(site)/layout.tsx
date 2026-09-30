import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { deviceId } from '@/lib/api';
import { currentStreak } from '@/lib/game';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const streak = await currentStreak(await deviceId());
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader streak={streak} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
