'use client';
/**
 * The climb (§5.3–5.4): one immersive screen for all three riddles.
 *
 * React renders the pieces; a requestAnimationFrame loop writes transforms and
 * positions straight to the DOM (like the reference prototype) so the camera,
 * flame, shake, climb and idle life run at 60 fps without re-rendering.
 *
 * Only the player's own data is ever fetched here: no crowd data, trap rates,
 * percentile or RQ until the play is finished (§5.5, §7.7). The results prefetch
 * starts only after the last answer comes back finished.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  PAN_MS, BOOST_START_MS, BOOST_TOTAL_MS, panDownProgress, panUpProgress, cameraOffsetY, signOpacity, flamePixels, flashColor, flashOpacity,
  climbProgress, dipPx, worldY, shakeOffset, hasSparks, hasSmoke, resultColor, levelColor, LEVEL_COLOR,
} from '@/lib/burner';
import { LEVELS, level } from '@/lib/scoring';
import { api, ApiError } from '@/lib/client';
import { track } from '@/lib/track';
import { fmtAlt, spokenAlt } from '@/lib/format';
import { shadowOf, SPRITES, WORLD, PALETTE, FLYER_SPRITE } from '@/lib/sprites';
import {
  balloonBob, pilotColor, cloudX, starOpacity, flyerKind, flyerX, type FlyerKind,
} from '@/lib/idle';
import { sfx, unlockAudio } from '@/lib/sfx';
import { prefetchResults } from '@/lib/resultsCache';
import { CLIMB_READY } from '@/lib/launch';
import { RiddleSign } from './RiddleSign';
import { ResultReveal } from './ResultReveal';
import { MuteButton } from './MuteButton';
import { Fairground, fairScale, PAD_DROP } from './Fairground';
import { AltitudeRuler, rulerGeometry, type RulerHandle, type RulerSegment } from './AltitudeRuler';
import type { AnswerResult, ServedRiddle, TodayState } from '@/lib/types';

/**
 * loading: Balloon shot at the current altitude while the riddle is fetched.
 * panup:   camera rises to the Question shot.
 * ignite:  sign in view, inputs locked until the fuel lights (served_at, §5.3).
 * ask → firing → reveal → (panup → ignite → ask …) and, after riddle 3, leaving.
 */
type Phase = 'loading' | 'panup' | 'ignite' | 'ask' | 'firing' | 'reveal' | 'leaving' | 'error';

interface Geo {
  W: number;
  H: number;
  phone: boolean;
  signW: number;
  gap: number;
  pad: string;
  promptPx: number;
  cardW: number;
  S: number; // balloon sprite scale: 6 on desktop, 4 on phones
  B: number; // balloon size (16 px sprite at scale S)
  BX: number; // balloon left
  BT0: number; // balloon top in the Balloon shot
}

// After riddle 3 the balloon flies back down to the fairground and lands on its pad (§5.3),
// then the screen fades to the results.
const LAND_MS = 2000;
const SETTLE_MS = 350;
const FADE_MS = 350;
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const FLYER_SCALE = 4;
const FAIR_ABOVE = 420; // room above the ground line for the ferris wheel and tent



function geometry(W: number, H: number): Geo {
  const phone = W < 768;
  const S = phone ? 4 : 6; // the balloon is the star of the scene (§5.3)
  const B = 16 * S;
  return {
    S,
    B,
    W,
    H,
    phone,
    signW: phone ? Math.min(358, W - 32) : Math.min(720, W - 64),
    gap: phone ? 48 : 88,
    pad: phone ? '18px 18px' : '24px 30px',
    promptPx: phone ? 26 : 34,
    cardW: phone ? Math.min(358, W - 32) : Math.min(480, W - 64),
    BX: Math.round(W / 2 - B / 2), // always horizontally centered
    BT0: Math.round(H / 2 - B / 2),
  };
}

function mix(a: string, b: string, k: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16));
  const A = p(a);
  const Bc = p(b);
  return `rgb(${A.map((v, i) => Math.round(v + (Bc[i] - v) * k)).join(',')})`;
}
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const snap2 = (v: number) => Math.round(v / 2) * 2;

/**
 * Tier ladder (§5.4): the levels up to yours are spread evenly along this answer's stretch of the
 * ruler (square-root scale, like the ruler), so the marks never bunch up where the climb slows.
 */
function tierAlt(c: number, from: number, to: number, j: number): number {
  const target = LEVELS.indexOf(level(c));
  const r = Math.sqrt(from) + ((Math.sqrt(to) - Math.sqrt(from)) * j) / (target + 1);
  return r * r;
}
/** Index into LEVELS the balloon has passed at altitude `cur` on the way from `from` to `to`. */
function tierAt(c: number, from: number, to: number, cur: number): number {
  const target = LEVELS.indexOf(level(c));
  const span = Math.sqrt(to) - Math.sqrt(from);
  const k = span > 0 ? clamp01((Math.sqrt(cur) - Math.sqrt(from)) / span) : 1;
  return Math.min(target, Math.floor(k * (target + 1) + 1e-9));
}
/** Inverse of worldY: the altitude drawn at world height y. */
const altAtWorldY = (y: number) => (y / 12) ** 2;
// Landing (§5.3): for the second half the camera stops following, so the balloon settles onto its
// pad where the results page shows it (basket LANDED_BASKET px above the bottom, fair at 2 px art).
const LANDED_BASKET = 34;
const SETTLE_FROM = 0.5;

/** The highest checkpoint crossed going from `from` up to `to`, or null. */
function passedCheckpoint(from: number, to: number): number | null {
  let hit: number | null = null;
  WORLD.checkpoints.forEach((cp, i) => {
    if (from < cp.altitudeM && to >= cp.altitudeM) hit = i;
  });
  return hit;
}

function resultHeadline(r: AnswerResult, isNumber: boolean) {
  if (r.timedOut) return 'Out of fuel';
  if (isNumber) return r.ladderLevel ?? 'Goldfish';
  return r.verdict === 'correct' ? 'Correct' : r.verdict === 'trapped' ? 'Trapped' : 'Not quite';
}

export function Climb() {
  const router = useRouter();
  const [geo, setGeo] = useState<Geo | null>(null);
  const [phase, setPhaseState] = useState<Phase>('loading');
  const [riddle, setRiddle] = useState<ServedRiddle | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [progress, setProgress] = useState<{ slot: number; closeness: number; altitudeGain: number }[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [igniteIn, setIgniteIn] = useState<number | null>(null);
  const [signError, setSignError] = useState<string | null>(null);
  const [caption, setCaption] = useState<number | null>(null); // checkpoint just passed: its fact shows briefly
  const [fatal, setFatal] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [reducedMotion, setReducedMotion] = useState(false);

  const reduce = useRef(false);
  const phaseRef = useRef<Phase>('loading');
  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };

  // Mutable animation state read by the rAF loop.
  const anim = useRef({
    alt: 0, fromAlt: 0, toAlt: 0, c: 0,
    fireAt: 0, boostAt: 0, panUpAt: 0, leaveAt: 0,
    resultReady: false,
    lastCur: 0,
    flyer: '' as FlyerKind | '',
    tierIdx: -1,
  });
  const clockOffset = useRef(0); // serverNow - clientNow
  const served = useRef<ServedRiddle | null>(null);
  const firingRef = useRef(false);
  const advancing = useRef(false);
  const lastTick = useRef(0);
  const timers = useRef<number[]>([]);

  // DOM refs written by the loop.
  const stage = useRef<HTMLDivElement>(null);
  const starsEl = useRef<HTMLDivElement>(null);
  const starEls = useRef<(HTMLDivElement | null)[]>([]);
  const scene = useRef<HTMLDivElement>(null);
  const cloudEls = useRef<(HTMLDivElement | null)[]>([]);
  const ruler = useRef<RulerHandle>(null);
  const sea = useRef<HTMLDivElement>(null);
  const groundOnScreen = useRef(true);
  const flyer = useRef<HTMLDivElement>(null);
  const flyerPx = useRef<HTMLDivElement>(null);
  const balloon = useRef<HTMLDivElement>(null);
  const flame = useRef<HTMLDivElement>(null);
  const fx = useRef<HTMLDivElement>(null);
  const sign = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const curtain = useRef<HTMLDivElement>(null);
  const altText = useRef<HTMLDivElement>(null);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, Math.max(0, ms)));
  };
  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);

  /* ---------- Layout: full-bleed, stable across the phone keyboard ---------- */
  useLayoutEffect(() => {
    reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReducedMotion(reduce.current);
    let lastW = 0;
    const measure = () => {
      const W = document.documentElement.clientWidth;
      const H = window.innerHeight;
      // Ignore height-only shrinks on phones (the on-screen keyboard).
      if (W === lastW && W < 768) return;
      lastW = W;
      setGeo(geometry(W, Math.max(H, 520)));
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', () => {
      lastW = 0;
      setTimeout(measure, 200);
    });
    return () => window.removeEventListener('resize', measure);
  }, []);

  /*
   * The phone keyboard: the scene above ignores it on purpose, but the riddle panels follow the
   * visible area (visualViewport) so the answer bar sits right above the keys instead of under them.
   */
  const [keyboard, setKeyboard] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onChange = () => {
      const covered = window.innerHeight - vv.height;
      const zoomed = Math.abs(vv.scale - 1) > 0.01; // pinch-zoom shrinks the visible area too
      setKeyboard(covered > 120 && !zoomed ? { top: Math.round(vv.offsetTop), height: Math.round(vv.height) } : null);
    };
    vv.addEventListener('resize', onChange);
    vv.addEventListener('scroll', onChange);
    onChange();
    return () => {
      vv.removeEventListener('resize', onChange);
      vv.removeEventListener('scroll', onChange);
    };
  }, []);

  /* ---------- Frame: everything the scene draws, from anim state ---------- */
  const frame = useCallback(
    (now: number) => {
      if (!geo || !stage.current) return;
      const a = anim.current;
      const p = phaseRef.current;
      const rm = reduce.current;
      const { W, H, BX, BT0, S, B } = geo;
      // The question sits above the balloon and the answer bar below it, both on screen at once,
      // so the camera never travels (§5.3): the pan only fades the panels.
      const travel = 0;

      // Camera: Question shot while asking, Balloon shot otherwise.
      let panK = p === 'ask' || p === 'ignite' || (p === 'error' && served.current) ? 0 : 1;
      let t = -1; // boost time
      if (p === 'firing') {
        panK = rm ? 1 : panDownProgress(now - a.fireAt);
        if (a.resultReady && a.boostAt && now >= a.boostAt) t = now - a.boostAt;
      }
      if (p === 'panup') panK = rm ? 0 : panUpProgress(now - a.panUpAt);
      // Landing: the balloon eases back to the ground evenly on screen (eased in world height, not
      // altitude, which the square-root scale would turn into a slam at the end), then a fade.
      const landing = p === 'leaving';
      const landT = landing ? Math.min(1, (now - a.leaveAt) / LAND_MS) : 0;
      const fadeT = landing ? Math.min(1, Math.max(0, (now - a.leaveAt - LAND_MS - SETTLE_MS) / FADE_MS)) : 0;
      const burning = p === 'firing' && t >= 0;
      const cur = burning
        ? a.fromAlt + (a.toAlt - a.fromAlt) * climbProgress(t)
        : landing
          ? altAtWorldY(worldY(a.alt) * (1 - easeInOut(landT)))
          : a.alt;
      const uc = worldY(cur);
      const BASE = BT0 + B;
      const shake = burning ? shakeOffset(a.c, t, rm) : { x: 0, y: 0 };

      stage.current.style.background = mix('#24457A', '#060A18', clamp01(uc / 2600));
      const fade = WORLD.starsFadeIn;
      const starBase = clamp01((uc - fade.fromWorldY) / (fade.toWorldY - fade.fromWorldY));
      if (starsEl.current) starsEl.current.style.opacity = String(starBase);
      starEls.current.forEach((el, i) => {
        if (el) el.style.opacity = String(starOpacity(now, i, rm));
      });
      if (scene.current) {
        // While landing, the camera eases off the balloon so it settles onto its pad at the bottom,
        // scaled to the results page's fair (2 px art: 2/3 on desktop, 1 on phones).
        const q = landing ? easeInOut(clamp01((landT - SETTLE_FROM) / (1 - SETTLE_FROM))) : 0;
        const drop = q * (H - LANDED_BASKET - BASE);
        const k = 1 + q * (2 / fairScale(W) - 1);
        scene.current.style.transformOrigin = `${W / 2}px ${BASE}px`;
        scene.current.style.transform = `translate3d(${shake.x}px, ${cameraOffsetY(panK, travel) + shake.y + drop}px, 0)${k !== 1 ? ` scale(${k})` : ''}`;
      }
      if (curtain.current) curtain.current.style.opacity = String(fadeT);

      WORLD.clouds.forEach((cl, i) => {
        const e = cloudEls.current[i];
        if (!e) return;
        e.style.top = `${Math.round(BASE - (worldY(cl.altitudeM) - uc))}px`;
        e.style.left = `${cloudX(now, i, Math.round(cl.xFraction * W), W, rm)}px`;
      });

      // Checkpoints on the ruler: passing one blips and shows its fact (§4.9).
      if (burning) {
        const passed = passedCheckpoint(a.lastCur, cur);
        if (passed !== null) {
          sfx.landmark();
          setCaption(passed);
        }
        a.lastCur = cur;
      }
      // Tier ladder: each level up to yours gets a mark on the ruler as the balloon passes it.
      if (burning && !rm) {
        const idx = tierAt(a.c, a.fromAlt, a.toAlt, cur);
        const target = LEVELS.indexOf(level(a.c));
        for (let j = a.tierIdx + 1; j <= idx; j++) ruler.current?.tier(tierAlt(a.c, a.fromAlt, a.toAlt, j), LEVELS[j], LEVEL_COLOR[LEVELS[j]], j === target);
        a.tierIdx = Math.max(a.tierIdx, idx);
      }
      ruler.current?.update(cur, burning ? { from: a.fromAlt, color: LEVEL_COLOR[LEVELS[Math.max(0, a.tierIdx)]] } : null);
      // The ground (the fairground) sits at altitude 0; it is only drawn while on screen.
      const groundTop = BASE + uc;
      if (sea.current) sea.current.style.top = `${groundTop}px`;
      groundOnScreen.current = groundTop - FAIR_ABOVE < H;

      // Ambient flyer for this altitude band.
      if (flyer.current && flyerPx.current) {
        const kind = flyerKind(cur);
        const rows = FLYER_SPRITE[kind];
        if (a.flyer !== kind) {
          a.flyer = kind;
          flyerPx.current.style.boxShadow = shadowOf(rows, FLYER_SCALE, PALETTE);
        }
        const fxX = p === 'firing' ? null : flyerX(now, W, rows[0].length * FLYER_SCALE, rm);
        flyer.current.style.visibility = fxX === null ? 'hidden' : 'visible';
        if (fxX !== null) {
          flyer.current.style.left = `${fxX}px`;
          flyer.current.style.top = `${snap2(BT0 - H * 0.28)}px`;
        }
      }

      // The balloon bobs whenever it's in the air, the burn included; the bob eases out as it lands.
      const dip = burning && !rm ? dipPx(a.c, t) : 0;
      const bob = balloonBob(now, rm) * (landing ? 1 - easeInOut(landT) : 1);
      const bTop = BT0 + dip + bob;
      if (balloon.current) balloon.current.style.transform = `translate3d(0, ${bTop - BT0}px, 0)`;
      if (flame.current) {
        const pilot = pilotColor(now, rm);
        flame.current.style.boxShadow = flamePixels(burning ? a.c : 0, burning ? t : -1)
          .map((px) => `${(px.x + 1) * S}px ${(px.y + 1) * S}px 0 0 ${burning ? px.color : pilot}`)
          .join(',');
      }

      if (fx.current) {
        let html = '';
        const cx = BX + B / 2;
        const cy = bTop + Math.round(B * 0.42);
        if (burning && !rm && hasSmoke(a.c)) {
          for (let j = 0; j < 5; j++) {
            const tt = clamp01((t - 200 - j * 140) / 900);
            if (tt > 0 && tt < 1) html += `<div style="position:absolute;left:${(cx - 4 + (j % 2 ? -1 : 1) * tt * 24).toFixed(1)}px;top:${(bTop + Math.round(B * 0.73) - tt * 100).toFixed(1)}px;width:8px;height:8px;background:#6B7599;opacity:${(1 - tt).toFixed(2)}"></div>`;
          }
        }
        if (burning && !rm && hasSparks(a.c)) {
          const ts = clamp01((t - 300) / 800);
          if (ts > 0 && ts < 1) {
            for (let q = 0; q < 12; q++) {
              const ang = (q * Math.PI) / 6;
              const d = 20 + ts * 84;
              html += `<div style="position:absolute;left:${(cx + Math.cos(ang) * d).toFixed(1)}px;top:${(cy + Math.sin(ang) * d).toFixed(1)}px;width:4px;height:4px;background:${q % 2 ? '#F0C674' : '#FFF6E0'};opacity:${(1 - ts).toFixed(2)}"></div>`;
            }
          }
        }
        fx.current.innerHTML = html;
      }

      if (sign.current) {
        sign.current.style.opacity = signOpacity(panK).toFixed(2);
        sign.current.style.visibility = panK >= 1 || !served.current ? 'hidden' : 'visible';
      }
      if (flash.current) {
        flash.current.style.background = flashColor(a.c);
        flash.current.style.opacity = burning && !rm ? flashOpacity(t).toFixed(2) : '0';
      }
      if (altText.current) altText.current.textContent = fmtAlt(cur);
      if (balloon.current) balloon.current.setAttribute('aria-label', `Your balloon at ${fmtAlt(cur)}`);
    },
    [geo],
  );

  /* ---------- Animation loop ---------- */
  const raf = useRef<number | null>(null);
  const finishBoost = useRef<() => void>(() => {});
  const finishPanUp = useRef<() => void>(() => {});

  useEffect(() => {
    const loop = (now: number) => {
      const a = anim.current;
      const p = phaseRef.current;
      if (p === 'firing' && a.resultReady && a.boostAt) {
        const t = now - a.boostAt;
        if (reduce.current || t >= BOOST_TOTAL_MS) finishBoost.current();
      }
      if (p === 'panup' && (reduce.current || now - a.panUpAt >= PAN_MS)) finishPanUp.current();
      frame(now);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [frame]);

  // Handoff (§5.2): draw the opening frame now (rAF is paused during a view transition), then tell
  // the homepage the climb is on screen so its cross-fade lands on the real scene.
  const announcedReady = useRef(false);
  useEffect(() => {
    if (!geo || announcedReady.current) return;
    announcedReady.current = true;
    frame(performance.now());
    window.dispatchEvent(new Event(CLIMB_READY));
  }, [geo, frame]);

  /* ---------- Server calls ---------- */
  const fail = (e: unknown) => {
    setFatal(e instanceof Error ? e.message : 'Something went wrong');
    setPhase('error');
  };

  const serverNow = () => Date.now() + clockOffset.current;
  const timeLeft = (r: ServedRiddle) => Math.min(r.timeLimitS, r.timeLimitS - (serverNow() - Date.parse(r.servedAt)) / 1000);

  const serve = useCallback(async (slot: number) => {
    const before = Date.now();
    const r = await api<ServedRiddle>('/api/riddle/serve', { slot });
    const after = Date.now();
    clockOffset.current = Date.parse(r.serverNow) - (before + after) / 2;
    served.current = r;
    setRemaining(timeLeft(r));
    setRiddle(r);
    setSignError(null);
    track('riddle_served', { slot, answerType: r.answerType });
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const beginPanUp = () => {
    anim.current.panUpAt = performance.now();
    setPhase('panup');
  };

  // After the pan-up: wait for the fuel to light (served_at), then ask.
  finishPanUp.current = () => {
    const r = served.current;
    if (r && Date.parse(r.servedAt) > serverNow()) {
      setIgniteIn(Math.ceil((Date.parse(r.servedAt) - serverNow()) / 1000));
      setPhase('ignite');
    } else {
      setIgniteIn(null);
      setPhase('ask');
    }
  };

  // Boot: resume wherever this device is today (§5.1). Altitude and served_at survive a refresh.
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const today = await api<TodayState>('/api/today');
        if (dead) return;
        if (today.status === 'finished') {
          router.replace('/results');
          return;
        }
        if (today.status === 'not_started') {
          track('play_start', { puzzleNumber: today.puzzleNumber });
          await api('/api/play/start', {});
        }
        anim.current.alt = today.altitude;
        setProgress(today.progress);
        await serve(today.currentSlot ?? 1);
        if (dead) return;
        beginPanUp();
      } catch (e) {
        if (!dead) fail(e);
      }
    })();
    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ignite: count down to the moment the fuel lights, then unlock the sign.
  useEffect(() => {
    if (phase !== 'ignite' || !riddle) return;
    const tick = () => {
      const ms = Date.parse(riddle.servedAt) - serverNow();
      if (ms <= 0) {
        setIgniteIn(null);
        sfx.ignite();
        setPhase('ask');
        return;
      }
      setIgniteIn(Math.ceil(ms / 1000));
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, riddle]);

  /* ---------- Fire ---------- */
  const fire = useCallback(
    async (input: string | null) => {
      const r = served.current;
      if (!r || phaseRef.current !== 'ask' || firingRef.current) return;
      unlockAudio();
      firingRef.current = true;
      const a = anim.current;
      a.fireAt = performance.now();
      a.boostAt = 0;
      a.resultReady = false;
      a.fromAlt = a.alt;
      a.lastCur = a.alt;
      a.tierIdx = -1;
      setSignError(null);
      setPhase('firing');
      try {
        const res = await api<AnswerResult>('/api/riddle/answer', { slot: r.slot, input });
        a.c = res.closeness;
        a.toAlt = res.altitudeTotal;
        a.boostAt = Math.max(a.fireAt + BOOST_START_MS, performance.now());
        a.resultReady = true;
        setResult(res);
        if (!reduce.current) later(() => sfx.burner(res.closeness), a.boostAt - performance.now());
        if (res.finished) {
          // The play is finished: the results may be requested now (§7.7).
          prefetchResults();
          router.prefetch('/results');
        }
        track('riddle_answered', {
          slot: r.slot, closeness: Math.round(res.closeness * 1000) / 1000, ladderLevel: res.ladderLevel ?? null, verdict: res.verdict ?? null,
          trapped: res.trapped, points: res.points, timeMs: Math.round(serverNow() - Date.parse(r.servedAt)),
        });
      } catch (e) {
        firingRef.current = false;
        if (e instanceof ApiError && e.status === 400) {
          // Unparseable on the server: back to the question, timer still running (§7.7).
          const reason = String(e.body.reason ?? e.message);
          track('input_rejected', { slot: r.slot, reason });
          setSignError(reason);
          setPhase('ask');
          return;
        }
        fail(e);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  finishBoost.current = () => {
    const a = anim.current;
    a.alt = a.toAlt;
    a.resultReady = false;
    firingRef.current = false;
    advancing.current = false;
    const res = result;
    if (res && served.current) {
      setProgress((p) => [...p.filter((x) => x.slot !== res.slot), { slot: res.slot, closeness: res.closeness, altitudeGain: res.altitudeGain }]);
      if (reduce.current) {
        const passed = passedCheckpoint(a.fromAlt, a.toAlt);
        if (passed !== null) setCaption(passed);
        const lv = level(res.closeness);
        ruler.current?.tier(a.toAlt, lv, LEVEL_COLOR[lv], true);
      }
      const head = resultHeadline(res, served.current.answerType === 'number');
      const ans = served.current.numberFormat === 'percent' ? res.answerDisplay.replace('%', ' percent') : res.answerDisplay;
      const landed = served.current.slot >= 3 ? ` Climb complete. You reached ${spokenAlt(a.alt)}.` : '';
      setAnnounce(`${head}. ${res.points} points. You climbed ${spokenAlt(res.altitudeGain)}. The answer is ${ans}.${landed}`);
      sfx.reveal(res.closeness, res.trapped);
    }
    setPhase('reveal');
  };

  // Timer: counts down from the server's served_at; auto-fires when the fuel runs out.
  useEffect(() => {
    if (phase !== 'ask' || !riddle) return;
    const tick = () => {
      const left = timeLeft(riddle);
      setRemaining(left);
      const secs = Math.ceil(left);
      if (secs <= 5 && secs > 0 && secs !== lastTick.current) {
        lastTick.current = secs;
        sfx.tick();
      }
      if (left <= 0) void fire(null);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, riddle, fire]);

  const leave = () => {
    if (reduce.current) {
      router.push('/results');
      return;
    }
    anim.current.leaveAt = performance.now();
    ruler.current?.clearTiers();
    setPhase('leaving');
    later(() => router.push('/results'), LAND_MS + SETTLE_MS + FADE_MS + 40);
  };

  const next = async () => {
    if (!result || !served.current || phaseRef.current !== 'reveal' || advancing.current) return;
    advancing.current = true;
    sfx.click();
    if (served.current.slot >= 3) {
      leave();
      return;
    }
    try {
      const slot = served.current.slot + 1;
      setResult(null);
      setCaption(null);
      ruler.current?.clearTiers();
      lastTick.current = 0;
      await serve(slot);
      beginPanUp();
    } catch (e) {
      fail(e);
    } finally {
      advancing.current = false;
    }
  };

  // Enter anywhere on the result advances, even if focus has wandered off the button.
  const nextRef = useRef(next);
  nextRef.current = next;
  useEffect(() => {
    if (phase !== 'reveal') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat || confirmLeave) return;
      if ((e.target as HTMLElement | null)?.closest?.('button, a, input, textarea, select')) return;
      e.preventDefault();
      void nextRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, confirmLeave]);

  // The fact caption fades after a few seconds, and never lingers into the next question.
  useEffect(() => {
    if (caption === null) return;
    const id = window.setTimeout(() => setCaption(null), 4500);
    return () => clearTimeout(id);
  }, [caption]);

  /* ---------- Render ---------- */
  if (!geo) return <div className="fixed inset-0 bg-[#24457A]" />;
  const { W, H, phone } = geo;
  const wideX = fairScale(W) > 2 ? Math.round(W / 4) : 0;

  const stars = (() => {
    const out: { x: number; y: number; s: number; c: string }[] = [];
    let v = 13;
    const rnd = () => (v = (v * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < (phone ? 22 : 36); i++) {
      const s = rnd() > 0.8 ? 4 : 2;
      out.push({ x: Math.floor((rnd() * W) / 4) * 4, y: Math.floor((rnd() * H * 0.6) / 4) * 4, s, c: i % 9 ? '#C9D3FF' : '#F27C9B' });
    }
    return out;
  })();

  const rg = rulerGeometry(W, H);
  const segments: RulerSegment[] = [];
  {
    let base = 0;
    for (const p of [...progress].sort((x, y) => x.slot - y.slot)) {
      segments.push({ from: base, to: base + p.altitudeGain, color: levelColor(p.closeness) });
      base += p.altitudeGain;
    }
  }
  const captionY = caption === null ? 0 : Math.round(rg.bottom - (rg.bottom - rg.top) * Math.sqrt(Math.min(1, WORLD.checkpoints[caption].altitudeM / 115_000)));
  const isNumber = served.current?.answerType === 'number';
  const col = result ? resultColor(result.closeness) : '#ECE6D6';
  const cardVisible = phase === 'reveal' && result;
  const currentSlot = riddle?.slot ?? 1;
  const finalSlot = (served.current?.slot ?? 1) >= 3;

  return (
    <div className="night-scope fixed inset-0 overflow-hidden" style={{ background: '#03050d' }}>
      <div ref={stage} className="absolute inset-0 overflow-hidden" style={{ background: '#24457A' }}>
        <div ref={starsEl} className="absolute inset-0" aria-hidden="true" style={{ opacity: 0 }}>
          {stars.map((s, i) => (
            <div
              key={i}
              ref={(el) => {
                starEls.current[i] = el;
              }}
              className="absolute"
              style={{ left: s.x, top: s.y, width: s.s, height: s.s, background: s.c }}
            />
          ))}
        </div>

        {/* The world: moved as one by the camera and the shake. */}
        <div ref={scene} className="absolute top-0 left-0" style={{ width: W, height: H }}>
          {WORLD.clouds.map((cl, i) => (
            <div
              key={i}
              ref={(el) => {
                cloudEls.current[i] = el;
              }}
              aria-hidden="true"
              className="absolute"
              style={{ left: Math.round(cl.xFraction * W), width: 96, height: 32, opacity: 0.35 }}
            >
              <div className="absolute" style={{ left: -8, top: -8, width: 8, height: 8, boxShadow: shadowOf(SPRITES.cloud, 8) }} />
            </div>
          ))}
          <div ref={flyer} aria-hidden="true" className="absolute" style={{ visibility: 'hidden', opacity: 0.5 }}>
            <div ref={flyerPx} className="absolute" style={{ left: -FLYER_SCALE, top: -FLYER_SCALE, width: FLYER_SCALE, height: FLYER_SCALE }} />
          </div>
          {/* 1.5x wide on desktop, centered, so the landing's 2/3 scale still fills the screen. */}
          <div ref={sea} className="absolute" style={{ left: -wideX, width: W + 2 * wideX, height: H + 400, background: '#251816' }}>
            {/* The fairground the balloon lifts off from: its launch pad sits right under the basket. */}
            <div className="absolute left-0" style={{ top: -FAIR_ABOVE, width: W + 2 * wideX, height: FAIR_ABOVE + H }}>
              <Fairground groundAt={(w) => FAIR_ABOVE - (PAD_DROP + 2) * fairScale(w)} walkDepth={10} active={() => groundOnScreen.current} />
            </div>
          </div>
          <div ref={fx} className="absolute top-0 left-0" aria-hidden="true" />

          <div ref={balloon} role="img" aria-label="Your balloon" className="balloon-glow absolute" style={{ left: geo.BX, top: geo.BT0, width: geo.B, height: geo.B }}>
            <div className="absolute" style={{ left: -geo.S, top: -geo.S, width: geo.S, height: geo.S, boxShadow: shadowOf(SPRITES.balloon.rows, geo.S) }} />
            <div ref={flame} className="absolute" style={{ left: -geo.S, top: -geo.S, width: geo.S, height: geo.S }} />
          </div>

        </div>

        <div ref={flash} aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ opacity: 0 }} />
      </div>

      {/* The riddle: question panel near the top, answer bar near the bottom, the balloon between. Never shakes. */}
      <div
        ref={sign}
        className="pointer-events-none absolute inset-0 z-[4]"
        style={{ color: '#ECE6D6', visibility: 'hidden', ...(keyboard ? { top: keyboard.top, height: keyboard.height, bottom: 'auto' } : null) }}
      >
        {riddle && (
          <RiddleSign
            riddle={riddle}
            remaining={phase === 'ask' ? remaining : phase === 'ignite' || phase === 'panup' ? timeLeft(riddle) : Math.max(0, remaining)}
            phone={phone}
            active={phase === 'ask'}
            igniteIn={
              phase === 'ignite'
                ? igniteIn
                : phase === 'panup' && Date.parse(riddle.servedAt) > serverNow()
                  ? Math.ceil((Date.parse(riddle.servedAt) - serverNow()) / 1000)
                  : null
            }
            error={signError}
            onFire={(v) => void fire(v)}
            onInvalid={(reason) => {
              setSignError(reason);
              track('input_rejected', { slot: riddle.slot, reason });
            }}
            onEdit={() => signError && setSignError(null)}
            layout={{
              width: geo.signW,
              left: Math.round((W - geo.signW) / 2),
              qTop: keyboard ? 12 : phone ? 76 : 72,
              aBottom: keyboard ? 8 : phone ? 20 : 40,
              promptPx: geo.promptPx,
              pad: geo.pad,
              available: keyboard?.height,
            }}
          />
        )}
      </div>

      {/* Result card: above the balloon, outside the shaking scene. On riddle 3 it carries the Landed line. */}
      {cardVisible && result && (
        <div
          className="panel fade-in absolute z-[6] box-border flex flex-col gap-[14px]"
          style={{
            left: Math.round((W - geo.cardW) / 2),
            top: phone ? 76 : 72,
            width: geo.cardW,
            padding: phone ? '18px 18px' : '22px 26px',
            color: '#ECE6D6',
            boxShadow: `inset 0 0 0 1px ${col}66, inset 0 2px 0 0 ${col}`,
          }}
        >
          <ResultReveal
            key={result.slot}
            result={result}
            headline={resultHeadline(result, isNumber)}
            isNumber={isNumber}
            color={col}
            phone={phone}
            final={finalSlot}
            altitude={anim.current.alt}
            reduced={reducedMotion}
            onNext={() => void next()}
          />
        </div>
      )}

      {/* HUD: wordmark, progress squares, sound, altimeter. Never shakes. */}
      <button
        type="button"
        onClick={() => setConfirmLeave(true)}
        className="pixel absolute cursor-pointer border-0 bg-transparent p-0 text-[#9097B4] hover:text-[#ECE6D6]"
        style={{ left: phone ? 16 : 32, top: phone ? 24 : 32, fontSize: 10, lineHeight: 1 }}
      >
        Riddler
      </button>
      <div
        role="img"
        aria-label={`Riddle ${Math.min(currentSlot, 3)} of 3`}
        className="absolute flex gap-[6px]"
        style={phone ? { right: 60, top: 24 } : { left: 32, top: 52 }}
      >
        {[1, 2, 3].map((k) => {
          const done = progress.find((p) => p.slot === k);
          const bg = done ? levelColor(done.closeness) : k === currentSlot ? '#9097B4' : '#2C3558';
          return <div key={k} style={{ width: 10, height: 10, background: bg }} />;
        })}
      </div>
      <MuteButton className="absolute" style={phone ? { right: 8, top: 8 } : { right: 20, top: 16 }} />
      <AltitudeRuler ref={ruler} g={rg} segments={segments} startAlt={anim.current.alt} />
      {caption !== null && (
        <div
          key={caption}
          role="status"
          className="panel fade-in absolute z-[6] box-border flex flex-col gap-2"
          style={{
            ...(rg.full
              ? { right: W - rg.lineX + 158, width: 168, top: Math.min(H - 150, Math.max(90, captionY - 30)) }
              : { left: 16, right: 32, bottom: 60 }),
            padding: '12px 14px',
          }}
        >
          <div className="eyebrow">
            {WORLD.checkpoints[caption].name} · {WORLD.checkpoints[caption].label}
          </div>
          <div className="text-[18px] leading-[1.2] text-[#9097B4]">{WORLD.checkpoints[caption].fact}</div>
        </div>
      )}
      <div className="absolute flex flex-col gap-[6px]" style={phone ? { left: 16, top: 44, color: '#ECE6D6' } : { left: 32, bottom: 28, color: '#ECE6D6' }}>
        <div className={phone ? 'sr-only' : 'text-[18px] leading-none text-[#9097B4]'}>Altitude</div>
        <div ref={altText} className="pixel text-[11px] leading-none">
          {fmtAlt(anim.current.alt)}
        </div>
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announce}
      </div>

      {/* Landed: the screen fades to the results' dusk. */}
      <div ref={curtain} aria-hidden="true" className="pointer-events-none absolute inset-0 z-10" style={{ background: '#070B1C', opacity: 0 }} />

      {(phase === 'error' || confirmLeave) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(3,5,13,0.8)] p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="climb-dialog-title"
            className="panel flex w-full max-w-[460px] flex-col gap-4 p-6 text-[#ECE6D6]"
          >
            {phase === 'error' ? (
              <>
                <h2 id="climb-dialog-title" className="pixel m-0 text-[12px] leading-[1.5] text-[#F0B45A]">The burner went out</h2>
                <p className="m-0 text-[20px] text-[#9097B4]">{fatal}</p>
                <div className="flex flex-wrap gap-4">
                  <button type="button" className="btn-primary" onClick={() => window.location.reload()} autoFocus>Try again</button>
                  <Link href="/" className="btn-secondary flex items-center no-underline">Go home</Link>
                </div>
              </>
            ) : (
              <>
                <h2 id="climb-dialog-title" className="pixel m-0 text-[12px] leading-[1.5]">Leave the climb?</h2>
                <p className="m-0 text-[20px] text-[#9097B4]">The fuel keeps burning while you&apos;re away. You can come back and pick up where you left off.</p>
                <div className="flex flex-wrap gap-4">
                  <button type="button" className="btn-primary" onClick={() => setConfirmLeave(false)} autoFocus>Keep climbing</button>
                  <Link href="/" className="btn-secondary flex items-center no-underline">Leave</Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
