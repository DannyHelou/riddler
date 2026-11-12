import Link from 'next/link';
import { requireAdmin } from '@/lib/adminGuard';
import { loadOverview } from '@/lib/adminData';
import { RANGES, formatMs, type RangeKey } from '@/lib/analytics';
import { longDate } from '@/lib/dates';
import { AdminHeader, Bars, Empty, HBars, Panel, RangeTabs, Stat, Table, pct } from '@/components/admin/AdminUI';

export const dynamic = 'force-dynamic';

const SLOT = ['', 'Warm-up', 'Trap', 'Boss'];

export default async function AdminOverview({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireAdmin();
  const q = (await searchParams).range;
  const range: RangeKey = RANGES.some((r) => r.key === q) ? (q as RangeKey) : 'today';
  const d = await loadOverview(range);
  const rangeLabel = d.from === d.to ? longDate(d.from) : `${longDate(d.from)} – ${longDate(d.to)}`;
  const finishedShare = d.funnel[1].count ? d.funnel[5].count / d.funnel[1].count : null;

  return (
    <>
      <AdminHeader title="Players" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Today" value={d.tiles.today} href={`/admin/plays/${d.today}`} sub="players" />
        <Stat label="Yesterday" value={d.tiles.yesterday} sub="players" />
        <Stat label="Last 7 days" value={d.tiles.week} sub="players" />
        <Stat label="Last 28 days" value={d.tiles.month} sub="players" />
        <Stat label="All time" value={d.tiles.allTime} sub={`${d.tiles.allPlays} plays`} />
      </div>

      <Panel title="Players per day" note="Click a bar for that day">
        <Bars
          ariaLabel="Players per day"
          labelEvery={d.daily.length > 14 ? 7 : 1}
          data={d.daily.map((x) => ({ label: x.date.slice(5), value: x.players, href: `/admin/plays/${x.date}` }))}
        />
      </Panel>

      <div className="flex flex-col gap-3">
        <RangeTabs current={range} ranges={RANGES} />
        <p className="panel-note m-0 text-[16px]">{rangeLabel}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Funnel" note={finishedShare === null ? undefined : `${pct(finishedShare)} of starters finish`}>
          <HBars data={d.funnel} />
        </Panel>
        <Panel title="When they play" note="Plays started, Toronto time">
          <Bars ariaLabel="Plays started by hour" labelEvery={3} height={110} color="var(--lvl-analyst)" data={d.hours.map((v, h) => ({ label: String(h), value: v }))} />
        </Panel>
      </div>

      <Panel title="Riddles" note="Closeness and rates are over answered riddles">
        {d.riddles.length ? (
          <Table head={['Slot', 'Riddle', 'Served', 'Answered', 'Left', 'Avg closeness', 'Correct', 'Trapped', 'Timed out', 'Median time']}>
            {d.riddles.map((r) => (
              <tr key={`${r.slot}-${r.riddleId}`}>
                <td>{SLOT[r.slot]}</td>
                <td className="max-w-[320px] overflow-hidden text-ellipsis" title={d.riddleLabels[r.riddleId]}>
                  {r.riddleId}
                </td>
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
          <Empty>No riddles served in this range.</Empty>
        )}
      </Panel>

      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="Coming back" note={`${d.retention.players} players`}>
          <p className="m-0 text-[22px]">
            <span className="panel-title text-[32px]">{pct(d.retention.players ? d.retention.returning / d.retention.players : null)}</span> had played before
          </p>
          <p className="panel-note m-0 text-[16px]">Current streak</p>
          <HBars data={d.retention.streaks} color="var(--lvl-genius)" share="total" />
        </Panel>
        <Panel title="Attention" note="While a riddle's clock ran">
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[21px]">
            <li>
              <strong className="panel-title">{d.attention.hiddenPlays}</strong> plays switched away from the tab
            </li>
            <li>
              <strong className="panel-title">{d.attention.hiddenEvents}</strong> times in total, {formatMs(d.attention.hiddenMs)} away
            </li>
            <li>
              <strong className="panel-title">{d.attention.pageLeft}</strong> closed or left the page mid-climb
            </li>
          </ul>
        </Panel>
        <Panel title="Devices" note="From events in range">
          <HBars
            data={[
              { label: 'Phone', count: d.devices.phone },
              { label: 'Desktop', count: d.devices.desktop },
            ]}
            color="var(--lvl-quant)"
            share="total"
          />
          <p className="panel-note m-0 text-[16px]">
            <Link href={`/admin/plays/${d.to}`} className="text-inherit">
              Every play on {longDate(d.to)} →
            </Link>
          </p>
        </Panel>
      </div>
    </>
  );
}
