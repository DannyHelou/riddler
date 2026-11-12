/** Server-side loaders for the owner dashboard. All queries and aggregation stay on the server. */
import { getStore } from './db';
import { addDays, launchDate, midnightInZone, todayPuzzleDate } from './dates';
import {
  attention, dailyCounts, funnel, hourHistogram, playRows, rangeDates, retention, riddleStats, timeline, type RangeKey,
} from './analytics';
import { assertServer } from './secrets';

assertServer('lib/adminData');

const ATTENTION_EVENTS = ['tab_hidden', 'tab_returned', 'page_left'];

/** ISO bounds of whole puzzle days (Toronto midnights). */
function dayBounds(from: string, to: string) {
  return { from: midnightInZone(from).toISOString(), to: midnightInZone(addDays(to, 1)).toISOString() };
}

async function riddleLabels(ids: string[]) {
  const store = await getStore();
  const out: Record<string, string> = {};
  await Promise.all(
    [...new Set(ids)].map(async (id) => {
      const r = await store.getRiddle(id);
      out[id] = r?.prompt_short || r?.prompt_md.slice(0, 80) || id;
    }),
  );
  return out;
}

export async function loadOverview(range: RangeKey) {
  const store = await getStore();
  const today = todayPuzzleDate();
  const launch = launchDate();
  const { from, to } = rangeDates(range, today, launch);
  const [allPlays, answers, events] = await Promise.all([
    store.playsBetween(launch, today),
    store.answersBetween(from, to),
    store.listEvents({ ...dayBounds(from, to), names: ['visit_home', ...ATTENTION_EVENTS] }),
  ]);
  const plays = allPlays.filter((p) => p.puzzle_date >= from && p.puzzle_date <= to);
  const devicesBetween = (a: string, b: string) => new Set(allPlays.filter((p) => p.puzzle_date >= a && p.puzzle_date <= b).map((p) => p.device_id)).size;
  const chartFrom = addDays(to, -27) < launch ? launch : addDays(to, -27);
  const stats = riddleStats(answers);
  return {
    today,
    from,
    to,
    tiles: {
      today: devicesBetween(today, today),
      yesterday: devicesBetween(addDays(today, -1), addDays(today, -1)),
      week: devicesBetween(addDays(today, -6), today),
      month: devicesBetween(addDays(today, -27), today),
      allTime: devicesBetween(launch, today),
      allPlays: allPlays.length,
    },
    daily: dailyCounts(allPlays, chartFrom, to),
    hours: hourHistogram(plays),
    funnel: funnel(events.filter((e) => e.name === 'visit_home'), plays, answers),
    riddles: stats,
    riddleLabels: await riddleLabels(stats.map((s) => s.riddleId)),
    retention: retention(allPlays.filter((p) => p.puzzle_date <= to), from, to),
    attention: attention(events),
    devices: {
      phone: new Set(events.filter((e) => e.device_kind === 'phone').map((e) => e.device_id ?? e.session_id)).size,
      desktop: new Set(events.filter((e) => e.device_kind === 'desktop').map((e) => e.device_id ?? e.session_id)).size,
    },
  };
}

export async function loadDay(date: string) {
  const store = await getStore();
  const [set, plays, answers, events] = await Promise.all([
    store.getDailySet(date),
    store.playsBetween(date, date),
    store.answersBetween(date, date),
    store.listEvents(dayBounds(date, date)),
  ]);
  const stats = riddleStats(answers);
  return {
    set,
    funnel: funnel(events.filter((e) => e.name === 'visit_home'), plays, answers),
    riddles: stats,
    riddleLabels: await riddleLabels(stats.map((s) => s.riddleId)),
    attention: attention(events),
    rows: playRows(plays, answers, events, todayPuzzleDate()),
    hours: hourHistogram(plays),
  };
}

export async function loadPlayer(deviceId: string, date: string) {
  const store = await getStore();
  const [play, history, events] = await Promise.all([
    store.getPlay(deviceId, date),
    store.listPlays(deviceId),
    store.listEvents({ ...dayBounds(date, date), deviceId }),
  ]);
  const answers = play ? await store.getAnswers(play.id) : [];
  return { play, history, answers, events, items: timeline(play, answers, events) };
}
