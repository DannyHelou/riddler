# Protect the players we have — plan

*2026-11-16. Follows the owner's question "what's the logical way to move forward?" at ~350 players/day. Scope: the "fix what's losing players" and "find out where players come from" items. Share text, streaks and reminders are a separate design pass.*

## 1. Midnight rollover (bug)

**Problem:** a climb in progress at 00:00 Toronto fails: the next request resolves to the new day, finds no play, and answers 409 "Start the climb first" → generic error. The busiest hour is the one after midnight, so this bites real players.

**Fix (`lib/game.ts`):** resolve the *active* date per device instead of always "today". If the device has no play today but has a play from yesterday that is unfinished, and it is less than `MIDNIGHT_GRACE_MIN` (45 min) past midnight, serve/answer/today use yesterday's date and set. Results also accept yesterday's play when it was finished inside the grace window and there is no play today (so the cross-midnight results screen loads). A new play for the new day is always allowed via Start.

**Test:** start at 2026-10-04, serve riddle 1, move to 2026-10-05 00:00:30 → serve/answer/results keep working on the 10-04 play; `getToday` reports it as in progress with `puzzleDate` 10-04; after the grace window the device is back to "not started" for 10-05.

## 2. Rate limiting

**Problem:** nothing stops a client from spamming the API (Oct 26: one client reloaded `/results` 5.5×/s for over an hour, doubling CPU).

**Fix (`lib/api.ts`, `lib/ratelimit.ts`):** in-memory fixed-window limiters, per device and per IP, applied in every game route. Per-instance only (Fluid compute shares instances), so generous and cheap, not airtight:
- per device, per 10 min: `today` 120, `play/start` 20, `riddle/serve` 60, `riddle/answer` 60, `results` 120, `stats` 60, `report` 20;
- per IP, per minute, across all game routes: 300 (iCloud Private Relay shares IPs, so no lower).
Over the limit → `429 "Slow down a little"` as a `GameError`, so the client shows the message rather than a crash. Tests cover the limiter and the 429.

## 3. Error alerts + schedule-end check

**Problem:** no monitoring. Errors only live in Vercel logs; the schedule silently ends 2027-10-03.

**Fix:** `lib/alerts.ts` — `reportError(where, error)` writes a `server_error` row into the `events` table (device/session "server", props: where, message) and, if `ALERT_WEBHOOK_URL` is set, posts a short message to it (Slack/Discord-compatible JSON; placeholder env var, owner can set it). Called from `handle()` on every non-game error (500s). The daily cron (`/api/cron/cleanup`) also checks that tomorrow's daily set exists and how many days of schedule remain; under 30 days, or tomorrow missing, it raises an alert. The dashboard overview gets an "Errors" panel (count in range, last few messages) and the schedule remaining days.

## 4. Referrer tracking

**Problem:** `visit_home` doesn't say where the visitor came from, so there is no way to know which channel works.

**Fix:** `TrackOnMount` adds `referrer` (hostname only, or "direct") and `utm_source` / `utm_medium` / `utm_campaign` (if present) to `visit_home`. Overview gets a "Where they come from" panel: distinct devices per source in the range. Dashboard only; no new storage.

## Order and shipping

One commit + push per item, in the order above; typecheck + tests after each; deploy by fast-forwarding `main` at the end; verify on riddlerr.com.
