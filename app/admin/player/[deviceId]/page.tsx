import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DATE, UUID, requireAdmin } from '@/lib/adminGuard';
import { loadPlayer } from '@/lib/adminData';
import { formatMs, streakAt } from '@/lib/analytics';
import { longDate, todayPuzzleDate } from '@/lib/dates';
import { AdminHeader, Empty, Panel, Stat } from '@/components/admin/AdminUI';

export const dynamic = 'force-dynamic';

const KIND_COLOR = { event: 'var(--haze)', play: 'var(--lvl-genius)', answer: 'var(--you)' } as const;
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-CA', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });

export default async function AdminPlayer({ params, searchParams }: { params: Promise<{ deviceId: string }>; searchParams: Promise<{ date?: string }> }) {
  await requireAdmin();
  const { deviceId } = await params;
  const q = (await searchParams).date;
  if (!UUID.test(deviceId)) notFound();
  const date = q && DATE.test(q) ? q : todayPuzzleDate();
  const d = await loadPlayer(deviceId, date);
  const days = new Set(d.history.map((p) => p.puzzle_date));
  const finished = d.history.filter((p) => p.finished_at);
  const avg = finished.length ? Math.round(finished.reduce((s, p) => s + (p.total_score ?? 0), 0) / finished.length) : null;

  return (
    <>
      <AdminHeader title={`Player ${deviceId.slice(0, 8)}`} back={{ href: `/admin/plays/${date}`, label: longDate(date) }} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Days played" value={days.size} />
        <Stat label="Finished" value={finished.length} />
        <Stat label="Average score" value={avg ?? '–'} />
        <Stat label="Streak that day" value={streakAt(days, date)} />
      </div>

      <Panel title="Days" note="Pick a day to see its timeline">
        <div className="flex flex-wrap gap-2">
          {d.history.map((p) => (
            <Link
              key={p.id}
              href={`/admin/player/${deviceId}?date=${p.puzzle_date}`}
              aria-current={p.puzzle_date === date ? 'page' : undefined}
              className={`px-2 py-1 text-[19px] no-underline ${p.puzzle_date === date ? 'bg-[var(--you)] text-[var(--night)]' : 'text-[var(--haze)] shadow-[inset_0_0_0_1px_var(--line)]'}`}
            >
              {p.puzzle_date.slice(5)} {p.finished_at ? `· ${p.total_score}` : '· unfinished'}
            </Link>
          ))}
          {!d.history.length && <Empty>No plays from this device.</Empty>}
        </div>
      </Panel>

      <Panel title={`Timeline · ${longDate(date)}`} note="Toronto time · grey: browser events · cyan: answers · orange: play">
        {d.items.length ? (
          <ol className="m-0 flex list-none flex-col p-0">
            {d.items.map((it, i) => (
              <li key={i} className="grid grid-cols-[84px_64px_1fr] items-baseline gap-3 border-b border-[var(--divider)]/50 py-[6px] text-[19px] leading-tight md:grid-cols-[96px_72px_220px_1fr]">
                <span className="tabular-nums text-[var(--haze)]">{time(it.ts)}</span>
                <span className="tabular-nums text-[var(--haze)] opacity-70">{it.gapMs === null ? '' : `+${formatMs(it.gapMs)}`}</span>
                <span style={{ color: KIND_COLOR[it.kind] }}>{it.label}</span>
                <span className="col-span-3 text-[var(--moonlight)] md:col-span-1">{it.detail}</span>
              </li>
            ))}
          </ol>
        ) : (
          <Empty>Nothing recorded for this device on this day.</Empty>
        )}
      </Panel>
    </>
  );
}
