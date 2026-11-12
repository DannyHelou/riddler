# Analytics and owner dashboard — design

*Brainstormed 2026-11-07. Status: **implemented 2026-11-12** (see docs/HANDOFF.md "Analytics and the dashboard").*

**How the open questions were settled:** retention 180 days (`EVENTS_RETENTION_DAYS`); the PostHog path was removed from `lib/track.ts`; the privacy paragraph is in `app/(site)/privacy/page.tsx`; `/admin` covers player analytics only. **Deviations:** the password hash is scrypt (Node built-in) rather than bcrypt, to avoid a dependency; the `events.ts` column is the event's time on the server clock (client time shifted by the batch's clock offset, else arrival time) rather than raw arrival time, because batching delayed arrival by up to 1.5 s and misordered timelines.

## Context

The owner wants to know how many people play Riddler, when, which riddles they answer, where players drop off mid-climb, and whether they leave or background the tab mid-riddle — with the ability to drill into one anonymous player's timeline (e.g. to debug a report like the `lib/parseNumber.ts` unit-parsing bug fixed 2026-11-06, where the player's symptom was "the Fire button doesn't work").

**What already exists, directly read from the code (2026-11-07):**

- `lib/track.ts`: a `track(event, props)` helper, already wired into 9 call sites (`components/Climb.tsx`, `Results.tsx`, `Debrief.tsx`), posting to PostHog via `sendBeacon` with a random per-session distinct ID (never the device ID) — but `NEXT_PUBLIC_POSTHOG_KEY` has never been set, so it's a no-op today. Nothing is currently captured anywhere outside the game's own tables.
- `docs/design-brief.md` §9 already specifies this same 9-event list, aimed at PostHog.
- Supabase already stores, per play: `plays.started_at/finished_at/total_score`, and per `answers` row: `served_at`, `answered_at`, `verdict`, `closeness`, `trapped`, `points`, `judge_source` — keyed by `device_id` and `puzzle_date` (`supabase/migrations/0001_init.sql`). This alone already supports daily player counts, per-riddle distributions, and a slot-by-slot completion funnel, with no new code.
- **Missing:** any record of a riddle that was served but never answered before a timeout; any tab-visibility signal; any admin UI. `components/Climb.tsx` has zero `visibilitychange`/`pagehide` listeners today.
- The device identity is one httpOnly, 1-year, `SameSite=Lax` cookie (`burner_device`, `middleware.ts`), no accounts.
- `app/(site)/privacy/page.tsx` currently states: *"We don't use advertising, tracking cookies, or analytics"* — this must be corrected honestly as part of this work, not silently.
- No admin route, no charting dependency, and `posthog-js` is not installed — `lib/track.ts` talks to PostHog's HTTP capture endpoint directly.

**Decisions made with the owner (2026-11-07):**
1. Dashboard detail level: **per-player timelines** (not just aggregate charts; not session replay).
2. Platform: **first-party**, in the existing Supabase project — no new vendor (PostHog stays wired but unused; can be revisited later).
3. Dashboard auth: **one shared password** (env var, hashed, httpOnly cookie).
4. Event set: **extend** the existing 9 events and their meaning; don't redesign the taxonomy.

## Goals

- Daily/weekly/time-of-day player counts, from first visit through finish.
- Per-riddle stats for any day: average closeness, trap rate, timeout rate, time-to-answer.
- A completion funnel: visited → started → answered slot 1 → slot 2 → slot 3 → finished.
- Detect and surface: a riddle served but never answered (abandoned, not just timed out), and tab-hidden time while a riddle's clock is running.
- Open one anonymous device's full timeline for a given day.
- Returning-player / streak distribution.
- No new third-party data processor; no consent banner required; privacy page stays accurate.
- Must not be able to slow down or break the game (HANDOFF already records one CPU-cap incident from unrelated traffic).

## Non-goals (out of scope for this spec)

- Session replay or screen recording.
- Marketing/acquisition analytics (UTM campaigns, ad attribution).
- Turning on PostHog (left as a future option, not removed).
- Rate limiting generally (tracked separately in HANDOFF "What's left" #1); this spec only caps the new endpoint specifically.

## Design

### 1. Data model: one new table

```sql
create table events (
  id          bigint generated always as identity primary key,
  ts          timestamptz not null default now(),     -- server-received time; authoritative
  client_ts   timestamptz,                             -- client-reported time; skew-check only, never relied on
  device_id   uuid,                                    -- from the existing burner_device cookie; null if absent
  session_id  text not null,                            -- per-tab sessionStorage id, same scheme as lib/track.ts today
  play_id     uuid references plays(id),                -- today's play, when one exists
  name        text not null,
  props       jsonb not null default '{}',
  path        text,
  country     text,                                     -- from the edge geo header; raw IP is never stored
  device_kind text                                       -- 'phone' | 'desktop'
);
create index events_ts_brin on events using brin (ts);
create index events_name_ts on events (name, ts);
create index events_play on events (play_id) where play_id is not null;
alter table events enable row level security;  -- same pattern as every other table: service role only
```

`device_id` + `play_id` make per-player timelines a join away from the existing `plays`/`answers` tables, which is what the per-player detail view needs. `jsonb props` avoids a migration per new property; the typed columns (`name`, `ts`, `device_id`, `play_id`) keep the common queries (funnels, per-day counts) index-backed instead of scanning jsonb.

**Retention:** a scheduled cleanup (reuse the cron mechanism from HANDOFF's planned "schedule-end alert" cron, or a new small one) deletes `events` rows older than a configurable window (default 180 days). Keeps the table small and limits exposure.

### 2. Event set — extend, don't replace

Existing 9 (`visit_home`, `play_start`, `riddle_served`, `input_rejected`, `riddle_answered`, `math_expanded`, `verdict_reported`, `play_finished`, `share_clicked`) keep their names and meaning. New:

| Event | Props | Fires when |
|---|---|---|
| `tab_hidden` | `slot`, `phase` | `document.visibilityState` → `hidden` while `phase === 'ask'` (riddle's clock is running) |
| `tab_returned` | `slot`, `phase`, `hiddenMs` | visibility → `visible` again, paired with the last `tab_hidden` by `(session_id, slot)` |
| `page_left` | `slot`, `phase`, `elapsedMs` | `pagehide` fires and the tab never came back — the real "gave up mid-riddle" signal |
| `play_resumed` | `slot` | `getToday`/climb mount finds an in-progress play from an earlier visit |
| `riddle_answered` *(existing, extended)* | adds `timeMs` | brief §9 already specified this prop; the call site in `Climb.tsx` doesn't send it yet |

Use `visibilitychange`, not `blur`/`focus` (those also fire for devtools and window-manager focus changes, not just "this tab left the screen"). Pair with `pagehide`, not `beforeunload` (unreliable on iOS Safari) as the last-resort beacon when the tab closes without returning.

### 3. Transport: `lib/track.ts` rewritten, `POST /api/events`

`track()` keeps its exact signature and call sites. Internally it now posts (via `sendBeacon`, falling back to `fetch(..., {keepalive:true})`, exactly as today) to `/api/events` instead of PostHog's capture URL. Behavior:

- Accepts one event or a small batch (a queued flush can coalesce a couple of events).
- Device ID comes from the request's own cookie, never trusted from the body.
- Validates `name` against a fixed enum, caps `props` size, caps batch size (≈20).
- Always returns `204`, even on a validation failure — swallows and logs server-side only. **Analytics must never be able to break or slow the game** (this is the operative constraint, given the documented CPU-cap incident).
- Per-device rate cap on this endpoint specifically, independent of whatever the project-wide rate-limiting fix (HANDOFF item 1) ends up being.

PostHog env vars and the `lib/track.ts` PostHog branch are left in place but unused (future option), or removed if the owner prefers — flagged as an open question for the plan, not decided here.

### 4. Dashboard: new `/admin` route group

- **`/admin/login`** — single password field; compares against a bcrypt hash of `ADMIN_PASSWORD` (env var holds the hash, not the plaintext); sets a signed httpOnly cookie on success; no username, no third-party auth.
- **`/admin`** (overview) — players today / yesterday / 7d / 28d toggle; a time-of-day histogram bucketed in America/Toronto (matching the existing reset timezone); the completion funnel (visited → started → slot 1/2/3 answered → finished); today's 3 riddles with avg closeness, trap rate, timeout rate; returning-player rate and streak distribution.
- **`/admin/plays/[date]`** — that day's funnel broken down, a table of every play (status, score, device) linking into:
- **`/admin/player/[deviceId]`** — one device's full timeline for a day: served → `tab_hidden(12s)` → `tab_returned` → answered(correct, 850ms) → ..., built by joining `events` with `plays`/`answers`.

All data fetched server-side (RSC); the admin pages never ship query/aggregation logic to the browser. Charts are flat SVG components matching the existing pixel-panel visual system (`.panel`/`.card` in `app/globals.css`) — no new charting dependency.

### 5. Privacy page

The current line ("We don't use advertising, tracking cookies, or analytics") must change to something accurate, e.g.: *"We keep anonymous game analytics (when you play, which riddles, whether you finish) tied to the same device ID used for the game itself, stored only on our own server. We never share it, and it's never used for advertising."* This is a legal-facing statement; the exact wording is called out as something the owner should explicitly approve in the plan/implementation step, not just accept as a side effect of a code change.

Because this design is first-party (no cross-site tracking, no ad tech, data stays on the site's own server, aggregate dashboards by default with per-player drill-down restricted to the password-protected admin), it fits within GDPR's and Quebec Law 25's allowances for a site's own first-party analytics without a consent banner — this should be re-confirmed against current guidance at implementation time rather than taken as settled legal advice here.

## Open questions for the implementation plan

1. Exact retention window for `events` (default proposed: 180 days) — confirm with owner.
2. Whether to leave the dormant PostHog code path in `lib/track.ts` or remove it now that first-party is the real path.
3. Exact wording of the updated privacy-page paragraph (drafted above; needs owner sign-off).
4. Whether `/admin` should also show content-level stats (riddle credits, schedule gaps) already flagged in HANDOFF "What's left," or stay scoped to player analytics only for v1.

## Testing

- Unit tests for the new `track()` transport (batching, validation, swallow-on-error) and for the funnel/aggregation queries (vitest, following the existing `lib/*.test.ts` pattern).
- An e2e check (Playwright) that visibility events fire correctly using the existing `window.visualViewport`-style fake-event pattern already used for the keyboard tests.
- Manual: log into `/admin` locally, play a full climb, confirm the event trail and the per-player timeline match what was actually played.
