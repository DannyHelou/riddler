# Riddler: handoff for the next agent

*Rewritten 2026-09-29. Launch target: `LAUNCH_DATE=2026-10-01`, two days out.*

Riddler is a daily math-riddle web game: three riddles a day, the same for everyone. You fly a pixel hot-air balloon up from a fairground. The closer your answer, the bigger the burner flame and the higher you climb. At the end you land back at the fair and see your score, your RQ (riddle quotient, compared with today's players), and explanations.

## Read first

1. **`CLAUDE.md`** (same as `AGENTS.md`): the project rules. Some of its original non-negotiables were changed by the owner (listed under "Owner decisions" below). The file is up to date with them.
2. **`docs/design-brief.md`**: the spec and source of truth. It has been kept in sync with every design pass, including §5.2 (homepage), §5.3 (climb), §5.5 (results) and §6 (visual design).
3. This file: current state, what's blocking launch, how the owner likes to work, and dev-environment gotchas.

`docs/immersion-plan.md` is a historical plan from 2026-09-26. Much of it has since been superseded, so trust the brief over it.

## Status in one glance

- **Playable end to end locally** on desktop and phone: homepage → three-riddle climb → landing → results and debrief → share.
- **Tests green:** `npx tsc --noEmit` clean, 67 unit tests (vitest), 8 Playwright tests (desktop 1280×800 and phone 390×844).
- **Not launch-ready.** See "Blocking launch". The big one is production services (nothing is configured). Content now covers a full year but still needs the owner's review.
- **No git commits yet.** The repo was initialized on 2026-09-26 but nothing is committed. Ask the owner before the first commit. The attribution lines are in your system instructions.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000; local JSON store in .data/, seeds itself from content/
npm test             # vitest, 67 tests
npm run e2e          # Playwright, starts its own server on :3200
npm run seed -- --check
npm run verify       # Monte Carlo check of every probability riddle (-- --only id1,id2 for a subset)
npm run schedule     # rebuild content/schedule.json from the riddle pool (keeps published days)
npm run tune-judge   # word-judge accuracy report
npx tsx scripts/simulate-crowd.ts 40   # dev: fake players so Results shows RQ and crowd stats (needs PUZZLE_DATE_OVERRIDE to match the server; clear them from .data/burner.json afterwards)
npx tsx scripts/shots.ts <baseUrl> <outDir>        # plays a full day at both sizes, screenshots every screen
npx tsx scripts/shot-page.ts <url> <outPrefix> [--full]   # screenshots one page at both sizes
```

**Useful dev behavior:**
- `PUZZLE_DATE_OVERRIDE=2026-10-01` pins "today". Without it, today is before launch and the homepage says "Preview".
- Outside production, days with no schedule entry reuse the scheduled sets in rotation.
- **Replaying a finished day:** the device ID is an httpOnly cookie, so a browser that has finished today goes straight to results. To play again, open `http://127.0.0.1:3000` (a different origin, so a new device) or use a private window.

## What the game looks like now

**Homepage** (`app/(home)/page.tsx`: full screen, no site header or footer):
- A pixel dusk sky with the moon, clouds and stars (`DuskSky` in `components/HomeSky.tsx`).
- A fairground along the bottom (`components/Fairground.tsx`, a canvas port of the owner's reference `pixel-fairgrounds.html`): ferris wheel, stalls, a tent, lights, bunting and strolling people.
- The balloon (96 px desktop, 64 px phone, with a warm glow) waits on a launch pad in the middle.
- A title "BURNER" in solid white with a crisp pink/cyan offset behind it, the subtitle "The daily climb", and a tiny tagline.
- Corners: a menu top-left (`HomeChrome.tsx`), sound top-right.
- Bottom: a tiny "▸ How to play", a crimson, gently bobbing **Start the climb** button (`StartButton.tsx`; the link `.home-start-hit` stays still and only its face `.home-start` bobs, so Playwright clicks stay stable; which also shows "Continue the climb" or "See your results" depending on state), and a tiny row with the puzzle number, the streak (only when above 0), the countdown (only once today is finished) and a Privacy link.
- Proportions follow Krillion's front page.

**Climb** (`components/Climb.tsx`, one screen, driven by a requestAnimationFrame loop):
- The balloon stays centered. The **question panel** sits near the top and the **answer panel** near the bottom (`components/RiddleSign.tsx`). The answer panel has a pixel fuel-ring timer, a cyan answer box, a thin fuel line and a crimson **Fire** button.
- The camera doesn't pan any more; the pan timings only fade the panels.
- Firing plays the burner reaction: flame, a full-screen flash in the level color, shake, sparks or smoke, and the climb. On the way up, a **tier marker** pops onto the altitude ruler for each level passed, up to yours (`tierAt` / `tierAlt` in `Climb.tsx`, `tier` / `clearTiers` in `AltitudeRuler.tsx`). The balloon keeps bobbing in the air, burn included.
- The result card (`ResultReveal.tsx`) appears where the question was.
- A quiet **altitude ruler** runs up the right edge (`components/AltitudeRuler.tsx`). It has six height checkpoints with facts from `design/world.json` (passing one pops a small fact caption), and "still above you" heights over the top.
- The climb starts on the same fairground.
- After riddle 3, **See your results** flies the balloon back down (`LAND_MS`, `SETTLE_MS`, `FADE_MS`), eased in screen height. In the second half the camera lets it sink onto its pad at the bottom of the screen, scaled to match the results page (`LANDED_BASKET`, `SETTLE_FROM`), then it fades to dusk and the results fade in (`.landed-in`) with the balloon in the same spot.

**Results** (`components/Results.tsx`):
- The first screen fits on desktop and on a 390×844 phone, balloon included (phone sizes are tightened in `Results.tsx`, `BellCurveReveal.tsx`, `.landed-spacer`, `.eyebrow-fit`). It reuses the homepage's dusk sky, with your result in the sky and a smaller fairground along the bottom where your balloon has landed (`LandedScene`, `LandedFairground`).
- A button (or scrolling) leads to "Riddle by riddle": a debrief card per riddle, with crowd data once 30 people have played, "Why", and "Show the math".

**Visual system:**
- Every box is a **panel**: a flat dark ground with faint scanlines and a hairline edge, a small pink spaced uppercase label (`.eyebrow`), a large softly glowing title (`.panel-title`) and a dim note (`.panel-note`). All of these live in `app/globals.css`.
- Colors:
  - Each closeness level has its own distinct hue: grey (Goldfish), blue, violet, magenta, orange, red (Oracle). `LEVEL_COLOR` in `lib/burner.ts`, `--lvl-*` in `design/tokens.css` and `app/globals.css` (night and light theme).
  - Traps, errors and the low timer are amber. "You" is cyan. The correct answer is red. Buttons are crimson.
- Fonts: Press Start 2P (small and sparing) and VT323.
- Textures stay **pixel art**, but **motion is fluid**: eased CSS, unrounded per-frame positions, and canvas movers placed to the screen pixel rather than the art pixel.

## Where things are

| Area | Files |
|---|---|
| Spec and rules | `docs/design-brief.md`, `CLAUDE.md` / `AGENTS.md` |
| Server game logic | `lib/game.ts`, behind every route in `app/api/*` (`today`, `play/start`, `riddle/serve`, `riddle/answer`, `results`, `stats`, `report`) |
| Reference math | `lib/scoring.ts`, `lib/burner.ts`, `lib/scoring.test.ts`. Don't change formulas without asking the owner |
| Storage | `lib/db.ts` (interface), `lib/store/local.ts` (dev and tests), `lib/store/supabase.ts` + `supabase/migrations/0001_init.sql` (production) |
| Answer checking | `lib/parseNumber.ts` (numbers), `lib/wordJudge.ts` + `lib/embed.ts` + `lib/judge.ts` (words) |
| Homepage | `app/(home)/page.tsx`, `components/HomeSky.tsx` (`DuskSky`, `HomeSky`, `LandedScene`), `Fairground.tsx`, `HomeChrome.tsx`, `HomeHowTo.tsx`, `StartButton.tsx`, `SiteModals.tsx`; `.home-*` styles in `app/globals.css` |
| Climb | `components/Climb.tsx`, `RiddleSign.tsx`, `ResultReveal.tsx`, `AltitudeRuler.tsx`, `Fairground.tsx` |
| Results | `components/Results.tsx`, `BellCurveReveal.tsx`, `Debrief.tsx`, `lib/resultsCache.ts` |
| Other site pages | `app/(site)/*` (results, about, privacy, contact) with `SiteHeader.tsx` / `SiteFooter.tsx` |
| Motion and sound | `lib/idle.ts` (idle motion, with tests), `lib/sfx.ts` (synthesized WebAudio), `components/MuteButton.tsx` |
| Timer grace | `lib/timing.ts` (`FUEL_GRACE_MS`, 2.15 s) |
| World data | `design/world.json` (checkpoints, beyond-reach heights, clouds), `design/sprites.json`, `design/tokens.css` |
| Content | `content/riddles/*.json`, `content/schedule.json`, `content/sims/`, `content/word-tests/`, `content/README.md` |
| Tests | `lib/*.test.ts`, `e2e/happy-path.spec.ts`, `e2e/reduced-motion.spec.ts` |

## Owner decisions (these override the original brief and CLAUDE.md)

- **Name:** "Riddler" (the owner switched back from "Riddler" on 2026-09-29). Player-facing copy, share text and docs say Riddler; internal names still say burner (`lib/burner.ts` is the balloon's burner, plus `.data/burner.json`, `BURNER_DATA_FILE`, the `burner_finished_*` storage key and the package name). A trademark check is still pending, and the domain is undecided (share text says `riddler.example`).
- **No hints.** Hints were removed from the UI, the API (`/api/riddle/hint` is gone), share text and How to play. The scoring formula keeps its hint term, which is always 0. `hint_md` in the content files and the `hint_used` database column are unused leftovers.
- **Colors per closeness level,** from grey to red, replacing the red-to-green hue ramp in `lib/burner.ts`. The tests were updated.
- **The shake is smooth,** no longer snapped to 2 px, in `lib/burner.ts`. The tests were updated.
- **Panels** with a hairline edge and a title glow replace notched frames on boxes. Buttons keep notched frames.
- **Pixel texture, fluid motion.** The owner rejected smooth "realistic" drawn water, but wants all movement eased and continuous.
- **A fairground, not a sea,** at ground level. The balloon is the visual focus.

## Blocking launch

1. **Content.** 272 riddles (90 warm-ups, 30 of them word riddles; 91 traps; 91 bosses) fill a full year, 2026-10-01 to 2027-09-30, generated by `npm run schedule`. Owner decision 2026-10-03: a riddle may return after 90 days (was 180), so each tier's pool needs at least 90 riddles; the pools rotate on slightly different cycles so no day's trio repeats. Sources and checks are in `content/SOURCES.md`; the full list is in `content/README.md`.
   - **The owner hasn't reviewed the riddles yet.** Do that before launch.
   - When the launch date is set: `LAUNCH_DATE=YYYY-MM-DD npm run schedule -- --rebuild`. After launch, plain `npm run schedule` never changes published days.
   - Every answer was computed independently (brute force or exact for counting/logic, 96 Monte Carlo sims for probability). Tight scoring on purpose where the trap is an off-by-one (e.g. `mutilated-chessboard`, `circle-chord-regions`, `discount-then-tax`).
   - `pirate-gold`'s prompt (224 characters) still covers most of the balloon on a phone; the rest are under about 185.
   - Related ideas sit a few days apart in places (the two Tower of Hanoi riddles, the coin-flip streak riddles). The scheduler doesn't space by topic yet.
   - `scripts/shots.ts` types day 1's answers, so run it with `PUZZLE_DATE_OVERRIDE=2026-10-01` (or edit the answers).
2. **Production services.** Nothing is configured.
   - Create a Supabase project and run `supabase/migrations/0001_init.sql`.
   - Set the env vars in `.env.example`. `.env.local` only has `LAUNCH_DATE`.
   - Run `npm run seed` against Supabase, then deploy (Vercel is assumed).
   - **The Supabase store has never run against a real database,** so do a full play against it before launch.
3. **Word judge.** Across all 5 word riddles it scores 95.8% (113/118) with the local n-gram embedder and no LLM, against a target of ≥ 95% (injection cases: 16/16). The misses are close calls that need the LLM or real embeddings (e.g. "computer keyboard", the typo "footsetps"). Set `ANTHROPIC_API_KEY` (Claude Haiku 4.5) and `VOYAGE_API_KEY`, then rerun `npm run tune-judge`. The thresholds (0.88 / 0.60 / 0.05) are an open decision.
4. **Open decisions (brief §12, the owner's call):** the domain, the trademark check, the reset time zone (America/Toronto now), the cold-start threshold (30), and the analytics provider (PostHog is wired but has no key, so it does nothing).

## Verification status (brief §10)

All ✅ except:
- **§10.9** Word judge below target (see above).
- **§10.13** Reduced motion passes in e2e, but there has been **no formal WCAG AA contrast audit**, especially of the light theme and the text over the fairground.

Not yet checked by a human:
- The sound effects (never listened to).
- The < 5 min phone playthrough (the e2e phone run takes about 25 s).

## Known nits and cleanups

- **Ignite countdown** sometimes shows "3" first (network time plus the grace). A shorter grace would make it read "2… 1…" reliably.
- **Enter during riddle 3's card reveal** can jump to the results before the correct answer has shown. The answer is on the results page too.
- **On desktop results,** the hero is a few px taller than the 1280×800 viewport, so the bottom of the launch pad sits right at the fold.
- **Unused code, safe to delete:**
  - `components/SkyPanel.tsx`, `components/TierCards.tsx`.
  - In `lib/idle.ts`: `glintOn`, `glintLevel`, `waveOffset`, `landmarkFlash` (only their tests use them).
- **Old test data:** `.data/e2e-*.json` and `.data/phone.json` are safe to delete. `.data/burner.json` is the owner's local play data; keep it.
- **Workspace root warning:** Next picks up a stray `C:\Users\Danny\package-lock.json`. Set `outputFileTracingRoot` or remove that file (ask first; it's outside the project).

## How the owner works

- They review by looking at the running app, so **keep a dev server up on :3000** and tell them to refresh.
- They give visual, iterative feedback ("too busy", "too zoomed in", "blocky"), often with a reference image or HTML file. Krillion (krillion.io) is the recurring reference. Match the reference's proportions and feel, adapted to Riddler's "rise up" theme.
- They like clean and minimal: remove anything not needed, and make secondary text small.
- When they say "smooth", they mean the **motion**, not the texture. Keep the pixel art.
- They sometimes ask for work to be delegated to a subagent.
- Keep the brief and this handoff in sync after each pass.

## Dev-environment gotchas (Windows + OneDrive, low memory)

- **Background servers get stopped under memory pressure,** and stopping a background task does **not** kill its Node process. Orphans keep holding ports (Next then silently picks :3002 and so on). Before starting a server, check what's on the port. Only kill processes you started, and kill them by port:
  `Get-NetTCPConnection -State Listen -LocalPort 3000 | % { Stop-Process -Id $_.OwningProcess -Force }`
- **Don't share `.next` between two servers.** OneDrive locking causes `EBUSY`. For a second server (screenshots or tests), use `NEXT_DIST_DIR=.next-<name>` and `BURNER_DATA_FILE=.data/<name>.json`. For the e2e suite, run `NEXT_DIST_DIR=.next-e2e npm run e2e`.
- **Next adds `".next-<name>/types/**/*.ts"` to `tsconfig.json` `include`** whenever it starts with a custom dist dir. Remove those lines afterwards, and delete the `.next-*` folders and throwaway `.data` files.
- **Stale generated types:** after deleting or moving a route, `.next/types/...` can keep a stale file that breaks `tsc`. Delete that file, or restart the dev server.
- **Stuck shell commands:** add `< /dev/null` to shell commands that might read stdin. Save multi-line Python edits to a scratch file and run that file, rather than using heredocs mixed with other commands.
- **Transient `SyntaxError: Unexpected end of JSON input`** in dev: the local store was read while being written. It clears on the next request.
- **Screenshots can't show motion.** To check that something animates, compare frames (for example, sample canvas pixels a few hundred ms apart with Playwright).
