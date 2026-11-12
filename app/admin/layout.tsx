import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard · Riddler',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin min-h-dvh bg-[var(--night)] text-[var(--moonlight)]">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6 px-4 py-8 md:py-12">{children}</div>
    </div>
  );
}
