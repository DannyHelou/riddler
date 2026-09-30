# Immersion pass: plan

Goal: close the feel gap with Krillion (always-moving scene, type → Enter → Enter loop, no dead time, no page seams) without breaking the brief's non-negotiables.

## Decisions (confirmed by the owner, 2026-09-26)

| Gap | Decision |
|---|---|
| Timer during transitions | Server grace: `served_at` is set in the future, and the sign shows "the fuel starts in 2…1". |
| Homepage → climb | Keep the §5.2 homepage but make the sky panel live, with an animated handoff into `/play`. No "Warming up" text. |
| End of climb | Keep a Landed moment, merged into the riddle 3 card (one click). Prefetch results and carry a transition. |
| Extras | Synthesized sound effects with a mute toggle, and a flat CRT scanline overlay. |

Unchanged: `lib/scoring.ts`, `lib/burner.ts`, `lib/scoring.test.ts`, the "no stats until the end" rule, and the pixel rules (everything snapped to 2 px, stepped timing, no gradients or blur).

## Rules that apply to every phase

- **Rendering.** All idle motion runs in the existing rAF loop in `Climb.tsx`, writing straight to the DOM. No React re-render per frame.
- **Pixel grid.** Every offset is snapped to 2 px, and every opacity or frame change is stepped. Motion is never smooth sub-pixel.
- **Reduced motion.** `prefers-reduced-motion` turns off all idle motion, dissolves, transitions and the scanlines. Sound is unaffected; it has its own mute.
- **Focus targets never move.** The sign, the input and the HUD never move during the ask phase (§6.7). Only the balloon and the world may move.
- **Brief updates.** The brief is updated in the same PR as each behaviour change (§5.2, §5.3, §7.7, plus a new §6.8 for sound).

---

## Phase 1: idle life in the climb (gap #1)

New pure module `lib/idle.ts`. Each function takes `(now, reduced)` and returns snapped values, and each is unit-tested (reduced motion returns 0 or static):

| Element | Behaviour |
|---|---|
| Balloon bob | ±2 px, stepped, ~2.4 s period. Runs only in the `ask`, `reveal` and `landed` phases. During the burn, `dipPx` owns the balloon. |
| Pilot light | The 2 pilot pixels alternate `#6FB7FF` / `#9FD4FF` every ~280 ms. Done in `Climb.tsx` by overriding the color of the `flamePixels(0, -1)` output, so `burner.ts` is untouched. |
| Clouds | Slow horizontal drift (2 px per ~120 ms, a different speed per cloud), wrapping at the screen edges, on top of the existing altitude parallax. |
| Stars | About 1 in 6 stars twinkles (opacity toggles 1 ↔ 0.4, stepped, staggered). |
| Sea | The wave line is drawn as a pixel pattern that shifts 2 px every 250 ms. A few 2 px "glints" blink on the surface. |
| Ambient flyers (stretch) | One sprite crosses the screen now and then, chosen by altitude band: gull near the sea, plane around 10 km, satellite in space. Needs 3 new pixel maps in `design/sprites.json`. |

Files: `lib/idle.ts`, `lib/idle.test.ts`, `components/Climb.tsx` (frame function), and possibly `design/sprites.json` + `lib/sprites.ts`.

## Phase 2: tighter loop and a louder reveal (gaps #4, #5, #6)

- **Enter everywhere.** A global `keydown` handler for Enter during `reveal`/`landed` calls `next()`, so it still works if focus drifts. Small "Enter ↵" hints go on **Fire the burner** and **Next riddle** (Press Start 2P, 8 px, haze). They are hidden on touch (`@media (hover: none)`).
- **Lighter sign, same pieces (§5.3 list kept).**
  - The hint link drops to haze at 20 px.
  - The fuel bar gets a 2 px stepped pulse and turns `--flare` in the last 10 s (already specified).
  - A numeric seconds readout goes next to the bar.
- **Reveal choreography** in the result card, stepped. Total ≤ 700 ms, and everything at once under reduced motion.
  1. The level or verdict sprite (8 × 8 at scale 5, from `sprites.levels` / `sprites.verdicts`) pops in 2 steps.
  2. The level name pixel-dissolves in: a character mask revealed in random order over 6 steps.
  3. "+N points" counts up.
  4. The "You said / The answer is" line and the button step in.

  The `aria-live` text is unchanged and fires once, at the end.
- **Landmarks that land.** When the altitude tween crosses a landmark during the boost:
  - its dashed line flashes `--line` for 2 steps;
  - its label jumps 2 px;
  - its icon blinks.

  Driven from the frame function by comparing `cur` against landmark altitudes.

Files: `components/Climb.tsx`, `components/RiddleSign.tsx`, a new `components/ResultReveal.tsx`, and `app/globals.css` (stepped keyframes with reduced-motion guards).

## Phase 3: timer grace (gap #3) — server change

- **`lib/game.ts` `serveRiddle`.** On *first* serve, set `served_at = now + FUEL_GRACE_MS`, where `FUEL_GRACE_MS = PAN_MS + 1500` (≈ 2.15 s). Put it in a new `lib/timing.ts`, not `burner.ts`. An already-served riddle keeps its `served_at`, so a refresh during the grace period keeps the same countdown.
- **`submitAnswer` and `takeHint`.** Reject with `409 "The fuel isn't lit yet"` while `now < served_at`. `secondsTaken` already clamps to ≥ 0. The scoring and time-bonus formulas are unchanged.
- **Client.** A new `ignite` phase sits between `panup` and `ask`:
  - The sign is visible and the input and hint are disabled.
  - The fuel bar area reads "the fuel starts in 2…1" (from `servedAt - serverNow`, using the existing clock offset).
  - At zero the phase switches to `ask` and the input takes focus.
  - Slot 1 gets the same treatment. That's what covers the homepage handoff.
- **Tests.** In `lib/game.test.ts`:
  - `served_at` is in the future;
  - an early answer or hint → 409;
  - elapsed time counts from `served_at`;
  - re-serving keeps the original `served_at`.

  Update both e2e specs to wait for the enabled input. They already `expect(input).toBeEnabled()`, so just raise the timeout.
- **Brief.** Update §5.3 timeline step 5 and the §7.7 `serve` row.

## Phase 4: live homepage and handoff (gap #2)

- **`SkyPanel` becomes a client component** with the same idle kit as phase 1:
  - balloon bob and pilot light;
  - star twinkle;
  - the dotted climb path "marches" upward (one dot lit, travelling up every 120 ms);
  - one drifting cloud.

  Server-rendered first frame, so there's no layout shift.
- **"Start the climb"** becomes a client button with an `href` fallback. On click:
  1. Fire `POST /api/play/start` right away (idempotent) and `router.prefetch('/play')`.
  2. Play a 600 ms stepped handoff: the balloon rises along the path, and the page steps to `#24457A` in 4 steps from the panel outward.
  3. Then `router.push('/play')`.
- **`/play` first frame.** The scene renders right away in the Balloon shot at the current altitude (sea on the first play), replacing the "Warming up the burner…" text. When `serve` returns, the camera pans up to the sign and the ignite countdown runs. Boot calls `today` and `play/start` in parallel where they don't depend on each other.

Files: `components/SkyPanel.tsx`, `app/(site)/page.tsx`, a new `components/StartButton.tsx`, and `components/Climb.tsx` (boot and the `loading` phase).

## Phase 5: one-click ending (gap #7)

- **The riddle 3 card merges result and Landed.** It shows the normal result rows, then steps in "Climb complete. You reached 58.3 km.", with a single **See your results** button. The separate "Finish the climb" → Landed step goes away. Update §5.3 "After riddle 3".
- **Prefetch.** When the slot 3 answer returns `finished: true`:
  - call `router.prefetch('/results')`;
  - fetch `/api/results` into a small client cache (`lib/resultsCache.ts`, in memory plus sessionStorage, with try/catch).

  The results page reads the cache first. This is allowed: the play is finished before anything is requested (§7.7).
- **Transition.** On click, the camera keeps rising: stars step brighter and the scene scrolls up ~200 px in 5 steps. The screen steps to `--night`, then the app navigates. The bell curve starts building on first paint. Reduced motion navigates straight away.

Files: `components/Climb.tsx`, `components/Results.tsx`, `lib/resultsCache.ts`.

## Phase 6: sound and mute (gap #8a)

- **`lib/sfx.ts`.** WebAudio only, with no audio files. A lazy `AudioContext` is created on the first user gesture (the Start click). All gains are low, and every sound is < 1.5 s.

  | Sound | Trigger |
  |---|---|
  | Burner whoosh | Filtered noise. Length and loudness follow the burn from `burner.ts`: `300 + 1200c` ms, intensity `I_peak`. |
  | Reveal | A rising 3-note square-wave chime, pitched by closeness. A low thud for c < 0.2, and a short buzz for "trapped". |
  | Last 5 s | A soft tick each second. |
  | Landmark pass | A tiny blip. |
  | UI | A click on primary buttons. |
- **Mute toggle.**
  - Placement: in the climb HUD (top right on desktop; on phones, under the progress squares) and in the site header.
  - Implementation: an `aria-pressed` button, a pixel speaker sprite, stored in `localStorage` (`burner:muted`, with try/catch).
  - Default: sound **on**, which only starts after the Start click. Easy to flip if you'd rather default to muted.
- **Brief.** Add §6.8 "Sound".

## Phase 7: CRT scanlines (gap #8b)

- A fixed overlay with `pointer-events: none`, using a 1 × 4 px PNG data URI (2 dark rows at ~10% alpha) tiled with `image-rendering: pixelated`. That's a flat image, not a gradient, so it respects §6.3.
- It covers the climb scene and the homepage sky panel only. It stays off text-heavy panels (sign, cards, HUD) to keep WCAG AA contrast, which gets checked after.
- Off under `prefers-reduced-motion` and `prefers-contrast: more`.

## Phase 8: verification

- `npm test`: `scoring.test.ts` unchanged and passing, plus the new `idle.test.ts` and `game.test.ts` cases.
- `npm run e2e`: the happy path updated for ignite and the one-click ending. The reduced-motion spec also asserts:
  - there's no ignite animation, only disabled-until-`served_at`;
  - no idle motion (the balloon's `top` is stable across 2 frames);
  - the scanlines are hidden.
- Manual, desktop and phone, in Chrome:
  - play the full climb and time the input loop;
  - confirm nothing in the sign moves during ask;
  - check the §10 acceptance criteria again.
- Performance: the climb holds 60 fps with idle motion on (DevTools performance panel, 4× CPU throttle).

## Suggested order and size

| Phase | Size | Why this position |
|---|---|---|
| 1 Idle life | M | Biggest feel gain, no risk |
| 2 Loop + reveal | M | Second biggest gain |
| 3 Timer grace | S–M | Server change; the ignite phase from here is reused by phase 4 |
| 4 Homepage handoff | M | Depends on ignite |
| 5 One-click ending | S | |
| 6 Sound | M | Independent |
| 7 Scanlines | S | Independent |
| 8 Verification | S | After each phase, plus a final pass |
