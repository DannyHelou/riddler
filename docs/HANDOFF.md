# Riddler: handoff for the next agent

*Rewritten 2026-10-04, launch day. Riddler is **live at https://riddlerr.com**; puzzle #1 was 2026-10-04.*

Riddler is a daily math-riddle web game: three riddles a day (warm-up, trap, boss), the same for everyone. You fly a pixel hot-air balloon up from a fairground. The closer your answer, the bigger the burner flame and the higher you climb. At the end you land back at the fair and see your score, your RQ (riddle quotient, compared with today's players), and explanations.

## Read first

1. **This file**: what's live, how production works, what's left, how the owner works, and environment gotchas.
2. **`CLAUDE.md`** (same as `AGENTS.md`): project rules. Some original non-negotiables were changed by the owner (see "Owner decisions" below).
3. **`docs/design-brief.md`**: the spec. Kept in sync with every design pass; where it disagrees with this file's "Owner decisions", the owner decisions win.
4. **`content/README.md`** and **`content/SOURCES.md`** before touching riddles. **`README.md`** for commands and the key-security rules.

`docs/immersion-plan.md` is a historical plan from 2026-09-26; trust the brief over it.

## Status in one glance

- **Live in production** on Vercel with Supabase. A full play through the live API was verified on launch day (saving, scoring, results, share text, the Jev word judge, no answers sent before answering).
- **Content:** 272 riddles and a 365-day schedule, 2026-10-04 → 2027-10-03.
- **Tests:** `npx tsc --noEmit` clean, **85 unit tests** (vitest) green. **Playwright e2e has not been re-run** since the launch-day changes (the start transition, the keyboard handling, the Oct 4 date); run it before larger changes (see gotchas).
- **Git:** `main` deploys to production. `riddle-bank-year-one` is the working branch and is level with `main`. Commit attribution lines are in your system instructions. Ask the owner before pushing to `main` (it ships immediately).

## Production

| Piece | Where |
|---|---|
| Site | https://riddlerr.com (custom domain on the Vercel project) |
| Hosting | Vercel project **`riddler`** (team `dannyhelous-projects`), production branch `main`; every push to `main` deploys. The local repo is linked (`.vercel/`, git-ignored) and the Vercel CLI is logged in (`npx vercel ...`). |
| Database | Supabase project **`gplxuuvqwxtwvwohzuze`** (https://gplxuuvqwxtwvwohzuze.supabase.co), created via Vercel → Storage, so Vercel holds its env vars (all **Sensitive**: the CLI can't read their values back). Schema: `supabase/migrations/0001_init.sql`. RLS is on with no policies: only the service-role key can read or write; the public anon/publishable key gets nothing. |
| Word judge | **Jev** by TypeSafe AI, `TYPESAFE_API_KEY` in Vercel (Production + Preview, Sensitive) and in local `.env.local`. |
| Other Vercel env | `LAUNCH_DATE=2026-10-04`, `NEXT_PUBLIC_SITE_DOMAIN=riddlerr.com`. |
| Owner contact | `dannyhelou817@gmail.com` (on the contact and privacy pages). |

### Deploying

1. Work on a branch, `npm test`, `npx tsc --noEmit`.
2. With the owner's go-ahead: `git push origin <branch>:main` (fast-forward), or merge.
3. Watch it: `npx vercel ls riddler` until the newest Production row says Ready (about 1 minute). The build runs `next build && tsx scripts/check-secrets.ts`, so a leaked key fails the deploy.
4. Confirm: `curl https://riddlerr.com/api/today` (expect the current `puzzleNumber`), and if you changed client code, grep the served chunk for a string from your change.

Preview deployments are behind Vercel Authentication. `npx vercel curl` fails on Windows ("URL rejected"), so test previews in a browser or test production directly.

### Changing riddles or the schedule in production

Riddles and the schedule live in `content/`; production reads them from Supabase, so after editing content you must **re-seed production**:

1. Edit `content/` → `npm run seed -- --check` → `npm run verify -- --only <ids>` for new probability riddles → `npm run schedule` (keeps published days; new riddles join future rotation).
2. In Supabase → Project Settings → **API Keys**, create a **new secret key** (`sb_secret_…`). Ask the owner to put it in a **git-ignored `.env.supabase`** in the repo root (never in chat, never in `.env.local`, or local dev would write to production):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://gplxuuvqwxtwvwohzuze.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
   ```
3. `npx tsx --env-file=.env.supabase scripts/seed.ts` (upserts riddles and daily sets, rewrites word-answer embeddings; writes retry on network blips).
4. Delete `.env.supabase` and **delete that secret key in Supabase**. The live site uses its own key from the Vercel integration.

**Never edit or remove a riddle that has already been played** without thinking it through: results pages read riddle rows live, so past results would change. `daily_sets.puzzle_number` is unique, so changing `LAUNCH_DATE` after launch would break re-seeding.

**The schedule runs out on 2027-10-03.** Before then, add riddles and rerun `npm run schedule -- --days <more>` and re-seed. Nothing alerts yet (see "What's left").

## Security (done; keep it that way)

- Keys are server-only: `lib/judge.ts`, `lib/db.ts`, `lib/store/supabase.ts` call `assertServer()` (`lib/secrets.ts`).
- `npm run check-secrets` (also after every build): fails on a key value or name in browser output or prerendered pages, a secret-looking `NEXT_PUBLIC_` variable, or a key value in a git-tracked file. The allowlist of public-by-design vars is `PUBLIC_ALLOWLIST` in `lib/secrets.ts`.
- `.gitignore` blocks every `.env*` except `.env.example`, plus `.vercel/`. `vercel link` appended duplicate rules once that re-ignored `.env.example`; check `.gitignore` after running Vercel CLI commands.
- Security headers in `next.config.ts` (nosniff, DENY framing, HSTS, referrer, permissions). No CSP yet.
- API errors return game messages or "Something went wrong"; details only in server logs.
- Production refuses to run without Supabase (`lib/db.ts`) instead of silently using the local file store.

**Owner to-dos from launch day (remind them if not confirmed):**
1. Delete the Supabase secret key that was pasted in chat on launch day (Supabase → Project Settings → API Keys; it was only used for the first seed).
2. Rotate the Jev key (it was pasted in chat): new key at console.typesafe.ai → update `TYPESAFE_API_KEY` in Vercel (Production + Preview) and `.env.local` → redeploy → delete the old key.
3. Turn on GitHub secret scanning + push protection (the repo `DannyHelou/riddler` is **public**).

## What's left (prioritised)

From the pre-launch audit (full report was in a scratch file; the items are all here):

**Should fix soon**
1. **Rate limiting**: none. Anyone can mint device IDs and spam answers, skewing percentile/RQ, running up Jev costs, and pushing junk into the public "top answers" (`lib/game.ts` crowd answers).
2. **Midnight rollover**: a climb in progress at midnight Toronto fails (the next request resolves to the new day → 409 "Start the climb first" → generic error). Pin requests to the play's own date.
3. **Crowd stats above 1,000 players/day**: `finishedScores` and `crowdAnswers` page without `ORDER BY`, and `deviceAnswers` has no paging (Supabase caps at 1,000 rows) in `lib/store/supabase.ts`.
4. **Schedule-end alert**: a daily check that tomorrow's set exists (e.g. a Vercel cron route), well before 2027-10-03.
5. **Error monitoring / alerting**: none (Vercel logs only).
6. **Content-Security-Policy**: not set (KaTeX, inline theme script and next/font need care).
7. **Riddle credits**: each riddle has a `credit` field (BrainStellar MIT, crawsome/riddles Unlicense, classics) that is never shown; add it to the debrief or an About/credits page.
8. **WCAG AA contrast audit**: not done (light theme, text over the fairground).
9. **E2E on 360 px**: the brief's §10.1 says 360 px; Playwright runs 390 px.

**Nice to have**
- A friendlier pre-launch/schedule-gap page than the 503 message; robots, sitemap, Open Graph image, root `not-found`/error pages.
- `outputFileTracingRoot` to silence the stray `C:\Users\Danny\package-lock.json` warning (don't delete that file without asking; it's outside the project).
- Make `finishPlay` safe against two concurrent final answers; add `judgeSource` to the `riddle_answered` event.
- Scheduler doesn't space related riddles (the two Tower of Hanoi riddles land 8 days apart).
- Brief §10.17 still describes a camera pan the owner removed.
- UI nits: the ignite countdown sometimes shows "3" first; Enter during riddle 3's reveal can skip ahead before the answer shows; desktop results hero is a few px taller than 1280×800.
- Dead code: `components/SkyPanel.tsx`, `components/TierCards.tsx`; `glintOn`, `glintLevel`, `waveOffset`, `landmarkFlash` in `lib/idle.ts` (only their tests use them). Old test data `.data/e2e-*.json`, `.data/phone.json` (keep `.data/burner.json`, the owner's local play data).

**Not checked by a human yet:** the sound effects; a < 5 min playthrough on a real phone; the keyboard behaviour on a real iPhone and Android (it was verified with a simulated keyboard only).

## Run it locally

```bash
npm install
npm run dev          # http://localhost:3000; local JSON store in .data/ (no Supabase vars in .env.local)
npm test             # vitest, 85 tests
npx tsc --noEmit
npm run e2e          # Playwright; use NEXT_DIST_DIR=.next-e2e (see gotchas)
npm run seed -- --check
npm run verify       # Monte Carlo check of every probability riddle (-- --only id1,id2)
npm run schedule     # rebuild content/schedule.json (keeps published days; --rebuild, --start, --days, --dry-run)
npm run tune-judge   # word-judge accuracy; uses Jev when TYPESAFE_API_KEY is set (-- --match 2 --floor -1 sends every non-exact case to Jev)
npm run check-secrets
npx tsx scripts/simulate-crowd.ts 40   # dev: fake players so Results shows RQ and crowd stats
npx tsx scripts/shots.ts <baseUrl> <outDir>   # screenshots a full play at both sizes; types day 1's answers, so run with PUZZLE_DATE_OVERRIDE=2026-10-04
```

- `.env.local` holds `LAUNCH_DATE=2026-10-04`, `TYPESAFE_API_KEY` and a `VERCEL_OIDC_TOKEN` from the CLI. Never print values; list names with `sed 's/=.*/=<hidden>/' .env.local`.
- `PUZZLE_DATE_OVERRIDE=YYYY-MM-DD` pins "today" locally. Outside production, days with no schedule entry reuse scheduled sets in rotation.
- Replaying a finished day locally: the device ID is an httpOnly cookie; use `http://127.0.0.1:3000` (a different origin) or a private window.

## How the game works now

**Homepage** (`app/(home)/page.tsx`): full-screen pixel dusk sky (`DuskSky` in `components/HomeSky.tsx`), a canvas fairground (`components/Fairground.tsx`), the balloon on its launch pad, the "Riddler" title with a pink/cyan offset, "The daily climb", a tiny tagline, menu and sound in the corners, and a crimson **Start the climb** button (`StartButton.tsx`) with puzzle number / streak / countdown / Privacy below. **Start handoff:** text fades while the scene pans until the balloon sits where the climb opens it (`--launch-shift`), then a View Transition cross-fades into the climb's first frame (`lib/launch.ts`; the climb fires `CLIMB_READY` once drawn). Proportions follow Krillion's front page.

**Climb** (`components/Climb.tsx`, one screen, a requestAnimationFrame loop): the balloon stays centered; question panel near the top, answer bar near the bottom (`RiddleSign.tsx`: fuel-ring timer, answer box, Fire). Firing plays the burner reaction (flame, level-colored flash, shake, sparks/smoke, the climb, tier markers on the altitude ruler). Result card where the question was. An altitude ruler on the right with height checkpoints and facts (`AltitudeRuler.tsx`, `design/world.json`). After riddle 3 the balloon flies back down onto its pad and fades into the results.
- **Phone keyboard:** the scene ignores the keyboard on purpose, but the riddle layer follows `visualViewport`. While the keyboard is open, the answer bar sits 8 px above it, the question shrinks/scrolls to fit, and the HUD (`.climb-hud`: wordmark, progress, mute, altitude, fact caption, ruler) fades out. Page scrolling is locked for the whole climb (touchmove blocked except inside `[data-scrollable]`), and the page snaps to the top when the keyboard opens or closes.

**Results** (`components/Results.tsx`): first screen fits desktop and a 390×844 phone; your result in the dusk sky with the balloon landed on a smaller fairground (`LandedScene`). "Riddle by riddle" debrief cards follow, with crowd data once 30 people have played, "Why", and "Show the math".

**Answer checking:** numbers via `lib/parseNumber.ts` and closeness in `lib/scoring.ts`. Word answers via `lib/wordJudge.ts`: normalize → cache → exact/one-typo → offline n-gram embeddings (`lib/embed.ts`, 512-d; no embedding provider) → **Jev** for close calls (`lib/judge.ts`: one Choice question correct/trapped/wrong, pinned to `jev-1.13.0`, confidence < 0.5 or any error → "wrong", uncached; Claude Haiku is the fallback only if `ANTHROPIC_API_KEY` is set and `TYPESAFE_API_KEY` isn't). Live accuracy on launch eve: **99.7%** (669/671), injection 91/91; Jev alone 98.7%, and it never marked a wrong answer correct.

**Visual system:** every box is a panel (flat ground, faint scanlines, hairline edge, `.eyebrow`, glowing `.panel-title`, dim `.panel-note`; all in `app/globals.css`). Closeness levels have distinct hues, grey (Goldfish) → red (Oracle) (`LEVEL_COLOR` in `lib/burner.ts`, `--lvl-*` in tokens). Traps/errors/low timer amber, "you" cyan, buttons crimson. Fonts Press Start 2P and VT323, **self-hosted via `next/font`** in `app/layout.tsx` (no Google requests; `--font-pixel-face` / `--font-body-face` feed `--font-pixel` / `--font-body` in `design/tokens.css`). Pixel textures, fluid motion.

## Content

- 272 riddles: 90 warm-ups (60 number + 30 word), 91 traps (number only), 91 bosses. 96 probability sims in `content/sims/`, 30 word-test files in `content/word-tests/`.
- **Repeat rule: a riddle may return after 90 days** (owner decision 2026-10-03, was 180; `REPEAT_GAP_DAYS` in `lib/content.ts`). Each tier's pool must hold ≥ 90 riddles; the pools are 90/91/91, so **there is no slack**: cutting a riddle means writing a replacement.
- `npm run schedule` (`lib/scheduleBuilder.ts`): each tier rotates through its pool (longest-rested first, stable hash order for new riddles); slightly different pool sizes make every day's trio new. Published days (today and earlier, Toronto) are never changed unless `--rebuild`.
- Prompts should stay under ~170 characters so the question panel clears the balloon on a phone (`pirate-gold`, 224, is the exception).
- **The owner hasn't reviewed the riddles.** They may ask for cuts or rewording.

## Where things are

| Area | Files |
|---|---|
| Spec and rules | `docs/design-brief.md`, `CLAUDE.md` / `AGENTS.md`, this file |
| Server game logic | `lib/game.ts`, behind `app/api/*` (`today`, `play/start`, `riddle/serve`, `riddle/answer`, `results`, `stats`, `report`); `lib/api.ts` (device cookie, error handling) |
| Reference math | `lib/scoring.ts`, `lib/burner.ts`, `lib/scoring.test.ts`. Don't change formulas without asking the owner |
| Storage | `lib/db.ts` (interface + store choice), `lib/store/local.ts` (dev/tests), `lib/store/supabase.ts` + `supabase/migrations/0001_init.sql` (production) |
| Answer checking | `lib/parseNumber.ts`, `lib/wordJudge.ts`, `lib/embed.ts`, `lib/judge.ts` |
| Keys and security | `lib/secrets.ts`, `scripts/check-secrets.ts`, `next.config.ts` headers, `middleware.ts` (device cookie) |
| Content tooling | `lib/content.ts` (validation), `lib/contentLoader.ts` (seeding, with retries), `lib/scheduleBuilder.ts`, `scripts/seed.ts`, `scripts/verify.ts`, `scripts/build-schedule.ts`, `scripts/tune-judge.ts` |
| Homepage | `app/(home)/page.tsx`, `components/HomeSky.tsx`, `Fairground.tsx`, `HomeChrome.tsx`, `HomeHowTo.tsx`, `StartButton.tsx`, `SiteModals.tsx`, `lib/launch.ts`; `.home-*` in `app/globals.css` |
| Climb | `components/Climb.tsx`, `RiddleSign.tsx`, `ResultReveal.tsx`, `AltitudeRuler.tsx`, `Fairground.tsx` |
| Results | `components/Results.tsx`, `BellCurveReveal.tsx`, `Debrief.tsx`, `lib/resultsCache.ts` |
| Other pages | `app/(site)/*` (results, about, privacy, contact) |
| Motion and sound | `lib/idle.ts`, `lib/sfx.ts`, `components/MuteButton.tsx`; timer grace in `lib/timing.ts` |
| World data | `design/world.json`, `design/sprites.json`, `design/tokens.css` |
| Tests | `lib/*.test.ts`, `e2e/happy-path.spec.ts`, `e2e/reduced-motion.spec.ts` (pinned to 2026-10-04) |

## Owner decisions (override the original brief and CLAUDE.md)

- **Name "Riddler", domain riddlerr.com** (two r's). Internal names still say burner (`lib/burner.ts`, `.data/burner.json`, `BURNER_DATA_FILE`, the `burner_*` storage keys, the package name). A trademark check on "Riddler" is still pending.
- **Launch date 2026-10-04**, reset time zone America/Toronto.
- **Word judge: Jev (TypeSafe AI). No embedding provider** (Voyage was removed; the offline embedder is the only one, so seeded and live embeddings always match).
- **Repeat gap 90 days** (was 180).
- **No hints.** Removed from UI, API, share text and How to play. The scoring hint term is always 0; `hint_md` and `hint_used` are unused leftovers (`hint_md` is still required by the validator).
- **Colors per closeness level** grey → red; **smooth shake**; **panels** instead of notched boxes (buttons keep notched frames); **pixel texture, fluid motion**; **a fairground, not a sea**, with the balloon as the focus. The camera no longer pans during the climb.
- **No analytics at launch** (PostHog is wired but has no key; the privacy page says there is no analytics, so update it if that changes).

## How the owner works

- Direct and fast; often types quickly with typos. Launch-day mindset: prefers shipping and then iterating.
- Reviews by looking at the running app (locally on :3000, or now on riddlerr.com on their phone) and gives visual feedback ("cluttered", "overlapping", "too busy"), sometimes with screenshots or reference HTML. Krillion (krillion.io) is the recurring visual reference.
- Likes clean and minimal: remove anything not needed, keep secondary text small. "Smooth" means the **motion**, not the texture.
- Says "make it live" to ship: that means push to `main` and confirm on riddlerr.com.
- Sometimes pastes API keys in chat. Use them as asked, keep them out of git and output, and remind them to rotate.
- Sometimes asks for work to be delegated to subagents.
- Keep the brief, `content/README.md` and this file in sync after each pass.

## Environment gotchas (Windows + OneDrive, low memory)

- **Background servers get stopped under memory pressure,** and stopping a background task does **not** kill its Node process; orphans keep holding ports (Next then silently picks :3001+). Check the port before starting; kill only what you started, by port:
  `Get-NetTCPConnection -State Listen -LocalPort 3000 | % { Stop-Process -Id $_.OwningProcess -Force }`
- **Changing `next.config.ts` restarts the dev server,** and it may not come back. Check :3000 afterwards.
- **Don't share `.next` between two servers** (OneDrive `EBUSY`). For a second server use `NEXT_DIST_DIR=.next-<name>` and `BURNER_DATA_FILE=.data/<name>.json`; for e2e, `NEXT_DIST_DIR=.next-e2e npm run e2e`.
- **Next adds `".next-<name>/types/**/*.ts"` to `tsconfig.json`** whenever it runs with a custom dist dir (`next build` too). Restore `tsconfig.json` afterwards (`git checkout -- tsconfig.json`) and delete the `.next-*` folder (it may be locked for a few seconds).
- **Playwright scripts:** write them as `.mjs` when they use `page.evaluate` with inner functions; tsx injects a `__name` helper that doesn't exist in the page.
- **Shell:** add `< /dev/null` to commands that might read stdin. Heredocs piped into Python get swallowed; save Python edits to a scratch file and run it. `clip.exe < file` puts text on the owner's clipboard (handy for SQL to paste into Supabase).
- **Vercel CLI:** `npx vercel env pull` returns `[SENSITIVE]` for sensitive vars; `npx vercel curl` fails on Windows; `vercel link` edits `.env.local` and `.gitignore`.
- **Seeding Supabase from this machine** hits intermittent `fetch failed`; `seedStore` retries, and rerunning is safe (everything is an upsert or replace).
- **Screenshots can't show motion.** Compare frames to check animation. The phone keyboard can't be opened headlessly; fake `window.visualViewport` with an init script (an `EventTarget` with `height`, `offsetTop`, `scale`) and dispatch `resize`.
