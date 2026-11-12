import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DATE, requireAdmin } from '@/lib/adminGuard';
import { loadDay } from '@/lib/adminData';
import { formatMs } from '@/lib/analytics';
import { addDays, longDate } from '@/lib/dates';
import { AdminHeader, Bars, Empty, HBars, Panel, Table, pct } from '@/components/admin/AdminUI';

export const dynamic = 'force-dynamic';

const SLOT = ['', 'Warm-up', 'Trap', 'Boss'];
const STATUS_COLOR = { finished: 'var(--you)', 'in progress': 'var(--haze)', abandoned: 'var(--flare)' } as const;

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-CA', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export default async function AdminDay({ params }: { params: Promise<{ date: string }> }) {
  await requireAdmin();
  const { date } = await params;
  if (!DATE.test(date)) notFound();
  const d = await loadDay(date);

  return (
    <>
      <AdminHeader title={longDate(date)} back={{ href: '/admin', label: 'Overview' }} />
      <nav className="flex gap-4 text-[20px]">
        <Link href={`/admin/plays/${addDays(date, -1)}`} className="text-[var(--haze)]">
          ← {addDays(date, -1)}
        </Link>
        <Link href={`/admin/plays/${addDays(date, 1)}`} className="text-[var(--haze)]">
          {addDays(date, 1)} →
        </Link>
        {d.set && <span className="panel-note text-[16px] self-center">Puzzle #{d.set.puzzle_number}</span>}
      </nav>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Funnel">
          <HBars data={d.funnel} />
        </Panel>
        <Panel title="When they played" note="Toronto time">
          <Bars ariaLabel="Plays started by hour" labelEvery={3} height={110} color="var(--lvl-analyst)" data={d.hours.map((v, h) => ({ label: String(h), value: v }))} />
        </Panel>
      </div>

      <Panel title="Riddles">
        {d.riddles.length ? (
          <Table head={['Slot', 'Riddle', 'Served', 'Answered', 'Left', 'Avg closeness', 'Correct', 'Trapped', 'Timed out', 'Median time']}>
            {d.riddles.map((r) => (
              <tr key={`${r.slot}-${r.riddleId}`}>
                <td>{SLOT[r.slot]}</td>
                <td title={d.riddleLabels[r.riddleId]}>{r.riddleId}</td>
                <td>{r.served}</td>
                <td>{r.answered}</td>
                <td className={r.abandoned ? 'text-[var(--flare)]' : ''}>{r.abandoned}</td>
                <td>{pct(r.avgCloseness)}</td>
                <td>{pct(r.correctRate)}</td>
                <td>{pct(r.trapRate)}</td>
                <td>{pct(r.timeoutRate)}</td>
                <td>{r.medianTimeMs === null ? '–' : formatMs(r.medianTimeMs)}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty>No riddles served this day.</Empty>
        )}
        <p className="panel-note m-0 text-[16px]">
          {d.attention.hiddenPlays} plays switched tabs mid-riddle ({formatMs(d.attention.hiddenMs)} away in total) · {d.attention.pageLeft} left the page mid-climb
        </p>
      </Panel>

      <Panel title="Every play" note={`${d.rows.length} plays`}>
        {d.rows.length ? (
          <Table head={['Started', 'Status', 'Score', 'Riddle 1', 'Riddle 2', 'Riddle 3', 'Tab away', 'Device', 'Player']}>
            {d.rows.map((r) => (
              <tr key={r.play.id}>
                <td>{time(r.play.started_at)}</td>
                <td style={{ color: STATUS_COLOR[r.status] }}>{r.status}</td>
                <td>{r.play.total_score ?? '–'}</td>
                {[1, 2, 3].map((slot) => {
                  const a = r.answers.find((x) => x.slot === slot);
                  const text = !a ? '' : !a.answered_at ? 'left' : a.verdict === 'timeout' ? 'timeout' : `${pct(a.closeness)}${a.trapped ? ' trap' : ''}`;
                  return (
                    <td key={slot} className={a && !a.answered_at ? 'text-[var(--flare)]' : ''} title={a?.raw_input ?? undefined}>
                      {text}
                    </td>
                  );
                })}
                <td>{r.hiddenCount || ''}</td>
                <td>{[r.device, r.country].filter(Boolean).join(' · ')}</td>
                <td>
                  <Link href={`/admin/player/${r.play.device_id}?date=${date}`} className="text-[var(--you)]">
                    {r.play.device_id.slice(0, 8)}
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty>Nobody played this day.</Empty>
        )}
      </Panel>
    </>
  );
}
