# CLAUDE.md — instructions for the coding agent

You are building **Riddler**, a daily math-riddle website. Everything you need is in this folder. Read this file first, then follow it.

## 1. Read in this order

1. `docs/design-brief.md` — the full spec. **It is the source of truth.**
2. `design/reference/climb-prototype.html` — open it in a browser (toggle desktop/phone, top right) and play all three riddles. This is exactly how the climb should look, feel, and time.
3. `lib/scoring.ts`, `lib/burner.ts`, `lib/scoring.test.ts` — reference math for scoring (§4) and the burner reaction and camera (§5.3–5.4).
4. `design/tokens.css`, `design/sprites.json`, `design/world.json` — colors, type, pixel maps, landmarks.
5. `design/reference/canvas-source/*.dc.html` — layouts for every other screen (see the table in `design/README.md`).
6. `content/` — seed riddles, the schedule, simulators, and word-judge tests (see `content/README.md`).

## 2. Non-negotiables

- **Server-side scoring.** Answers, trap values, and accepted word lists never reach the browser before the player answers (§7.7).
- **No comparative stats during the climb.** Crowd data, trap rates, percentile, RQ, and explanations are only requested and rendered after the play is finished (§5.5, §7.7).
- **Reuse the reference math.** Copy `lib/scoring.ts` and `lib/burner.ts` into the app unchanged; keep `lib/scoring.test.ts` passing. If you need to change a formula, stop and ask.
- **Phone mirrors desktop.** Same pages, same pieces, same order; only sizes and stacking change (§6.6). The balloon is always horizontally centered.
- **Pixel rules.** No rounded corners, gradients, or blur. Boxes are panels (`.panel` / `.card` in `app/globals.css`: flat ground, faint scanlines, hairline edge); the only soft glow is on panel titles. Buttons keep notched frames. 2 px grid, Press Start 2P + VT323 only (§6).
- **Accessibility.** `prefers-reduced-motion` cuts between camera shots and drops shake/sparks/smoke (§5.4.6); `aria-live` result announcements (§6.7); visible focus.
- **Copy.** Sentence case. Never call the RQ an "IQ".

## 3. Build order

Follow the milestones in §11 of the brief. After each milestone: run the tests, run the app, and check the relevant acceptance criteria in §10.

1. Skeleton: Next.js app, `tokens.css`, fonts, site header/footer, homepage (desktop and phone).
2. Data: Supabase schema (§7.6), `scripts/seed.ts` loading `content/`, `scripts/verify.ts` (port `content/sims/run-all.ts`).
3. Number loop: parser (§7.4), `serve` / `answer` routes, the climb screen with camera pan and burner reaction.
4. Scoring: wire `lib/scoring.ts`; results page with percentile, RQ, share.
5. Word loop: `wordJudge.ts` (§7.5), embeddings, verdict cache, LLM judge, `scripts/tune-judge.ts` against `content/word-tests/`.
6. Signature moments: landmarks, clouds, stars, sparks/smoke, bell-curve reveal, riddle-by-riddle debrief.
7. Hardening: resume mid-climb, idempotency, cold starts, reports, accessibility pass, analytics, Playwright.

## 4. When to stop and ask

- Anything listed under **Open decisions** in §12 (name, domain, reset time zone, providers, thresholds).
- A contradiction between the brief and a reference file (the brief wins, but say so).
- Any change to scoring, the burner formulas, or the "no stats until the end" rule.

## 5. Commands you should end up with

```bash
npm run dev          # local app
npm test             # vitest (includes lib/scoring.test.ts)
npm run seed         # validate + load content/ into the database
npm run verify       # Monte Carlo check of every probability riddle
npm run tune-judge   # word-judge accuracy report
npm run e2e          # Playwright happy path
```

## 6. Environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=      # server only
ANTHROPIC_API_KEY=              # server only, word judge (Claude Haiku 4.5)
VOYAGE_API_KEY=                 # server only, embeddings
LAUNCH_DATE=2026-10-01          # puzzle #1, America/Toronto
```
