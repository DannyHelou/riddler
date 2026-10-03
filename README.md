# Riddler — build handoff

A daily math-riddle website. Three riddles a day, same for everyone, each with a trap. You play from inside a pixel hot-air balloon: every answer fires the burner, and the closer you are, the bigger the flame and the higher you climb. Stats only appear once you land.

## Running the app

```bash
npm install
cp .env.example .env.local   # everything is optional for local dev
npm run dev                  # http://localhost:3000
```

With no Supabase variables set, the app uses a local JSON store at `.data/burner.json` and seeds itself from `content/` on first request. Outside production, days with no schedule entry reuse scheduled sets in rotation, and `PUZZLE_DATE_OVERRIDE=2026-10-01` pins "today" for testing.

| Command | What it does |
|---|---|
| `npm run dev` | Local app |
| `npm test` | Vitest: scoring, burner, parser, word judge, content validation, game service |
| `npm run seed` | Validate `content/` (§8.3) and load riddles, schedule, embeddings into the configured store (`-- --check` validates only) |
| `npm run verify` | Monte Carlo check of every probability riddle (`-- --only id1,id2` for a subset) |
| `npm run schedule` | Rebuild `content/schedule.json` from the riddle pool: each tier rotates, a riddle returns after 90+ days, published days are kept |
| `npm run tune-judge` | Word-judge accuracy report per stage (needs `ANTHROPIC_API_KEY` for close calls) |
| `npm run e2e` | Playwright happy path on desktop (1280×800) and phone (390×844) |
| `npx tsx scripts/simulate-crowd.ts 40` | Dev only: 40 simulated players so Results shows RQ and crowd stats |

**Production:** create a Supabase project, run `supabase/migrations/0001_init.sql`, set `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VOYAGE_API_KEY`, `ANTHROPIC_API_KEY`, `LAUNCH_DATE`, then `npm run seed` and deploy to Vercel.

### Where things live

- `app/` routes: `(site)/` pages with header and footer (home, results, about…), `play/` the full-bleed climb, `api/` the §7.7 routes.
- `lib/game.ts` is the server service behind every route; `lib/scoring.ts` and `lib/burner.ts` are the reference math, unchanged.
- `lib/db.ts` defines the `Store` interface; `lib/store/supabase.ts` (production) and `lib/store/local.ts` (dev/tests).
- `components/Climb.tsx` is the climb (a port of `design/reference/climb-prototype.html`), `components/Results.tsx` the results and debrief.

## What's in this folder

```
burner-handoff/
├── CLAUDE.md                     ← instructions for the coding agent (AGENTS.md is the same file)
├── README.md                     ← this file
├── docs/
│   └── design-brief.md           ← the full spec (source of truth)
├── lib/
│   ├── scoring.ts                ← closeness, points, levels, traps, percentile, RQ, altitude
│   ├── burner.ts                 ← flame, color, shake, climb, camera timing
│   └── scoring.test.ts           ← 16 passing tests pinning every formula
├── design/
│   ├── README.md
│   ├── tokens.css / tokens.json  ← colors, type, notched frames, buttons
│   ├── sprites.json              ← all pixel art as data
│   ├── world.json                ← landmarks, clouds, star fade
│   └── reference/
│       ├── climb-prototype.html  ← runnable prototype (open in a browser)
│       └── canvas-source/        ← source of every designed screen
└── content/
    ├── README.md
    ├── riddles/*.json            ← 6 seed riddles
    ├── schedule.json
    ├── sims/*.ts                 ← Monte Carlo verifiers (all passing)
    └── word-tests/*.json         ← word-judge test set with injection attempts
```

Live design canvas (for humans): https://claude.ai/artifact/LUPztY8cRcmJh71fKrV3fQ

## How to hand it off

1. Create an empty repo and copy this whole folder in as the root.
2. Open it with your coding agent (Claude Code, Cursor, etc.).
3. Paste the prompt below.

## Starter prompt

```
You're building Riddler, a daily math-riddle website, from the handoff in this repo.

Start by reading CLAUDE.md, then docs/design-brief.md in full. Open
design/reference/climb-prototype.html in a browser and play it on both desktop
and phone sizes before writing any UI.

Rules:
- The design brief is the source of truth. If a reference file disagrees with
  it, follow the brief and tell me about the mismatch.
- Reuse lib/scoring.ts and lib/burner.ts as-is and keep lib/scoring.test.ts
  passing.
- Answers never reach the browser before the player answers, and no
  comparative stats appear until the climb is finished.
- The phone layout mirrors desktop.

Work milestone by milestone (brief §11). Before starting each milestone, tell
me your plan in a few lines. After finishing it, run the tests, check the
matching acceptance criteria in §10, and summarize what's done and what's
next. Stop and ask me about anything in §12 "Open decisions" instead of
guessing.

Start with milestone 1.
```

## Before you start: open decisions

These are listed in brief §12. Decide them up front if you can, so the agent doesn't have to stop:

- **Name and domain.** The name is "Riddler" (the owner switched back from "Riddler" on 2026-09-29). It still needs a trademark check, and the domain is open.
- **Daily reset time zone.** Default America/Toronto.
- **Launch date.** Sets puzzle #1.
- **Providers.** Supabase, Vercel, Voyage AI (embeddings), Claude Haiku 4.5 (word judge), PostHog or Plausible.
- **Content.** Done for year one: 272 riddles and a 365-day schedule (owner review pending).
