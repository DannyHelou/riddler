/**
 * Owner dashboard building blocks: flat panels and SVG bar charts in the pixel style
 * (square corners, no gradients, 2 px grid). Server components; no chart library.
 */
import Link from 'next/link';
import { logout } from '@/app/admin/actions';

export function AdminHeader({ title, back }: { title: string; back?: { href: string; label: string } }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1">
        <p className="eyebrow m-0">
          {back ? (
            <Link href={back.href} className="text-inherit no-underline hover:underline">
              ← {back.label}
            </Link>
          ) : (
            'Riddler dashboard'
          )}
        </p>
        <h1 className="panel-title m-0 text-[34px] leading-none md:text-[40px]">{title}</h1>
      </div>
      <form action={logout}>
        <button type="submit" className="panel-note cursor-pointer border-0 bg-transparent p-0 hover:text-[var(--moonlight)]">
          Log out
        </button>
      </form>
    </header>
  );
}

export function Panel({ title, note, children, className = '' }: { title: string; note?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`panel flex min-w-0 flex-col gap-3 p-4 md:p-5 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="eyebrow m-0">{title}</h2>
        {note && <span className="panel-note text-[16px]">{note}</span>}
      </div>
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, href }: { label: string; value: string | number; sub?: string; href?: string }) {
  const body = (
    <>
      <span className="panel-note text-[16px]">{label}</span>
      <span className="panel-title text-[40px] leading-none">{value}</span>
      {sub && <span className="text-[18px] leading-none text-[var(--haze)]">{sub}</span>}
    </>
  );
  const cls = 'panel flex min-w-0 flex-col gap-2 p-4 text-inherit no-underline';
  return href ? (
    <Link href={href} className={`${cls} hover:shadow-[inset_0_0_0_1px_var(--you)]`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Vertical bars with a label under each (days, hours). */
export function Bars({ data, color = 'var(--you)', height = 140, labelEvery = 1, ariaLabel }: { data: { label: string; value: number; href?: string }[]; color?: string; height?: number; labelEvery?: number; ariaLabel: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 12;
  const GAP = 4;
  const width = 32 + data.length * (W + GAP);
  const top = 16;
  return (
    // rtl container: when the chart is wider than a phone, it opens scrolled to the latest bars.
    <div className="overflow-x-auto [direction:rtl]" data-scrollable>
      <svg role="img" aria-label={ariaLabel} style={{ direction: 'ltr', shapeRendering: 'crispEdges' }} width={Math.max(width, 200)} height={height + top + 22} className="mr-auto block">
        <line x1={0} x2={width} y1={top + height + 0.5} y2={top + height + 0.5} stroke="var(--divider)" />
        {data.map((d, i) => {
          const h = Math.round((d.value / max) * height / 2) * 2;
          const x = 16 + i * (W + GAP);
          const bar = (
            <g key={i}>
              <title>{`${d.label}: ${d.value}`}</title>
              <rect x={x} y={top + height - h} width={W} height={Math.max(h, d.value ? 2 : 0)} fill={d.value ? color : 'var(--divider)'} />
              {d.value > 0 && (
                <text x={x + W / 2} y={top + height - h - 4} textAnchor="middle" fontSize={14} fill="var(--haze)" fontFamily="var(--font-body)">
                  {d.value}
                </text>
              )}
              {i % labelEvery === 0 && (
                <text x={x + W / 2} y={top + height + 17} textAnchor="middle" fontSize={14} fill="var(--haze)" fontFamily="var(--font-body)">
                  {d.label}
                </text>
              )}
            </g>
          );
          return d.href ? (
            <a key={i} href={d.href}>
              {bar}
            </a>
          ) : (
            bar
          );
        })}
      </svg>
    </div>
  );
}

/** Horizontal bars with counts and their share of the first row (funnels) or of the total (buckets). */
export function HBars({ data, color = 'var(--you)', share = 'first' }: { data: { label: string; count: number }[]; color?: string; share?: 'first' | 'total' }) {
  const base = Math.max(1, share === 'first' ? (data[0]?.count ?? 1) : data.reduce((s, d) => s + d.count, 0));
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[96px_1fr_88px] items-center gap-3 text-[20px] leading-none">
          <span className="text-[var(--haze)]">{d.label}</span>
          <span className="h-[14px] bg-[var(--divider)]">
            <span className="block h-full" style={{ width: `${(d.count / max) * 100}%`, background: color }} />
          </span>
          <span className="text-right tabular-nums">
            {d.count}
            <span className="text-[var(--haze)]"> · {Math.round((d.count / base) * 100)}%</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function RangeTabs({ current, ranges }: { current: string; ranges: { key: string; label: string }[] }) {
  return (
    <nav aria-label="Date range" className="flex flex-wrap gap-2">
      {ranges.map((r) => (
        <Link
          key={r.key}
          href={`/admin?range=${r.key}`}
          aria-current={r.key === current ? 'page' : undefined}
          className={`px-3 py-1 text-[20px] no-underline ${r.key === current ? 'bg-[var(--you)] text-[var(--night)]' : 'text-[var(--haze)] shadow-[inset_0_0_0_1px_var(--line)] hover:text-[var(--moonlight)]'}`}
        >
          {r.label}
        </Link>
      ))}
    </nav>
  );
}

export const pct = (x: number | null) => (x === null ? '–' : `${Math.round(x * 100)}%`);

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-[20px] text-[var(--haze)]">{children}</p>;
}

/** A plain table in a scroll container, so the page never scrolls sideways on a phone. */
export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto" data-scrollable>
      <table className="w-full border-collapse text-left text-[19px] leading-tight">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap border-b border-[var(--divider)] px-2 py-2 font-normal text-[var(--haze)]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:whitespace-nowrap [&_td]:border-b [&_td]:border-[var(--divider)]/50 [&_td]:px-2 [&_td]:py-[6px]">{children}</tbody>
      </table>
    </div>
  );
}
