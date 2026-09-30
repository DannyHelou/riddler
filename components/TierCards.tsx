import { TIER_COLOR, TIER_SHORT, TIER_TIME_LIMIT, TIERS } from '@/lib/types';

const time = (s: number) => (s < 60 ? `${s} sec` : `${s / 60} min`);

/** Today's three riddles as one quiet line: a colored pixel, the tier, its fuel. */
export function TierCards() {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-[18px] leading-none text-haze" aria-label="Today's three riddles">
      {TIERS.map((t) => (
        <li key={t} className="flex items-center gap-2">
          <span className="h-2 w-2" style={{ background: TIER_COLOR[t] }} aria-hidden="true" />
          <span>
            {TIER_SHORT[t]}, {time(TIER_TIME_LIMIT[t])}
          </span>
        </li>
      ))}
    </ul>
  );
}
