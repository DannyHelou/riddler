'use client';
/**
 * The fairground at the foot of the climb (§5.2, §5.3), after the owner's reference
 * (pixel-fairgrounds.html): grass and dirt, a ferris wheel, two game stalls, a striped tent,
 * string lights and bunting, and people strolling either side of a clear center where the
 * balloon waits on its launch pad.
 *
 * Drawn on a canvas in "art pixels" (4 screen px on desktop, 2 on phones) so the texture is
 * chunky pixel art, but anything that moves is placed to the screen pixel, not the art pixel,
 * so the motion is fluid. The layout is built around the horizontal center, so it works at
 * any width (the edges crop on narrow screens). One still frame under reduced motion.
 */
import { useEffect, useRef } from 'react';

const P = {
  grassL: '#47d63e', grassM: '#2fb033', grassD: '#1f7a2a',
  dirt: '#5e3b2a', dirt2: '#7d5236', dirt3: '#94643f',
  wood: '#4a2f3a', cream: '#fff1d8', red: '#e0455a', dark: '#2d1c3a',
};
const GOND = ['#ffd23f', '#ff6b8b', '#4fd1e8', '#8cf06a', '#ff9b4a', '#c58bff', '#ff6b8b', '#4fd1e8'];
const SKINS = ['#f6d2b0', '#e0a97c', '#b97a52', '#8a5536', '#5e3a24'];
const HAIRS = ['#2a1a1a', '#5a3620', '#e8c26a', '#b04a2a', '#1f1f3a', '#dcdcdc'];
const SHIRTS = ['#ff6b8b', '#4fd1e8', '#ffd23f', '#8cf06a', '#c58bff', '#ff9b4a', '#ffffff', '#3a6fe0'];
const PANTS = ['#3b3060', '#2d3a5a', '#4a3a2a', '#1e2a44'];
const BALLOONS = ['#ff4b6b', '#ffd23f', '#4fd1e8', '#8cf06a'];

/** Where the launch pad's top sits below the grass line, in art pixels. The balloon rests on it. */
export const PAD_DROP = 9;
/** Art-pixel size in screen px for a given screen width. */
export const fairScale = (w: number) => (w < 768 ? 2 : 3);

interface Person {
  x: number; y: number; dir: number; v: number; z: [number, number];
  skin: string; hair: string; shirt: string; pant: string; kid: boolean; balloon: string | null; pause: number; ph: number;
}

interface Props {
  /** The grass line's distance from the top of the canvas, in screen px, for a canvas of this size. */
  groundAt: (w: number, h: number) => number;
  /** How far below the grass line people may stroll, in art pixels. */
  walkDepth?: number;
  /** Only animate while this returns true (e.g. the ground is on screen). */
  active?: () => boolean;
  /** Art-pixel size in screen px for a given width (default `fairScale`). */
  artScale?: (w: number) => number;
}

export function Fairground({ groundAt, walkDepth = 26, active, artScale }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const opts = useRef({ groundAt, walkDepth, active, artScale });
  opts.current = { groundAt, walkDepth, active, artScale };

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Seeded RNG: the same fair on every load.
    let seed = 1337;
    const rnd = () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
    const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

    let dpr = 1, W = 0, H = 0, S = 4, LW = 0, G = 0, c = 0; // screen size, art-pixel size, art width, grass line (art px), center (art px)
    let ground: HTMLCanvasElement | null = null;
    let people: Person[] = [];

    // Art-pixel rect (snapped to the art grid): the static texture.
    const R = (x: number, y: number, w: number, h: number, col: string, g: CanvasRenderingContext2D = ctx) => {
      g.fillStyle = col;
      g.fillRect(Math.floor(x), Math.floor(y), w, h);
    };
    // Screen-pixel-snapped rect for things that move: still chunky, but glides 1 screen px at a time.
    const M = (x: number, y: number, w: number, h: number, col: string) => {
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(x * S) / S, Math.round(y * S) / S, w, h);
    };
    const line = (x0: number, y0: number, x1: number, y1: number, col: string) => {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let e = dx + dy;
      ctx.fillStyle = col;
      for (;;) {
        ctx.fillRect(x0, y0, 1, 1);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * e;
        if (e2 >= dy) { e += dy; x0 += sx; }
        if (e2 <= dx) { e += dx; y0 += sy; }
      }
    };

    const layout = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.clientWidth;
      H = cv.clientHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      S = (opts.current.artScale ?? fairScale)(W);
      LW = Math.ceil(W / S);
      const LH = Math.ceil(H / S);
      G = Math.round(opts.current.groundAt(W, H) / S);
      c = Math.round(LW / 2);

      // Static ground: grass along the line, dirt below, bushes at the far edges, the launch pad.
      seed = 1337;
      ground = document.createElement('canvas');
      ground.width = LW;
      ground.height = LH;
      const g = ground.getContext('2d')!;
      R(0, G + 4, LW, LH - G - 4, P.dirt, g);
      // Speckled dirt near the grass, where people walk; further down the ground settles into
      // plain night-dark bands so the text over it stays readable.
      const busy = G + 26;
      for (let i = 0; i < LW * 22 * 0.09; i++) R(ri(0, LW), ri(G + 7, busy), ri(1, 4), ri(1, 2), rnd() < 0.6 ? P.dirt2 : P.dirt3, g);
      ['#4f3224', '#432a1f', '#38231b', '#2e1d18', '#251816'].forEach((col, i) => R(0, busy + i * 6, LW, i === 4 ? LH : 6, col, g));
      for (let x = 0; x < LW; x++) {
        const tuft = (x * 7) % 5 === 0 ? 2 : x % 3 === 0 ? 1 : 0;
        R(x, G - 1 - tuft, 1, tuft + 3, P.grassL, g);
        R(x, G + 2, 1, 2, P.grassM, g);
        if (x % 2 === 0) R(x, G + 4 + (x % 4 === 0 ? 1 : 0), 1, 2, P.grassD, g);
      }
      const bush = (bx: number, w: number) => {
        for (let i = 0; i < w; i++) {
          const h = 6 + Math.round(3 * Math.sin((i / w) * Math.PI)) + (i % 5 === 0 ? 1 : 0);
          R(bx + i, G - h, 1, h, i % 3 === 0 ? P.grassM : P.grassL, g);
          R(bx + i, G - 2, 1, 2, P.grassD, g);
        }
      };
      bush(c - 162, 18);
      bush(c + 140, 22);
      const pad = [18, 26, 30, 32, 32, 30];
      pad.forEach((w, i) => R(c - w / 2, G + PAD_DROP + i, w, 1, i < 4 ? '#9a93ab' : '#6f6884', g));
      for (let x = c - 14; x < c + 14; x += 4) R(x, G + PAD_DROP + 4, 2, 1, (x - c + 14) % 8 === 0 ? '#ffd23f' : '#3a334a', g);
      R(c - 2, G + PAD_DROP + 1, 4, 1, '#bdb6cc', g);

      // People stroll either side of the clear center.
      seed = 4242;
      const zones: [number, number][] = [[Math.max(4, c - 154), c - 44], [c + 41, Math.min(LW - 6, c + 152)]];
      const depth = Math.min(opts.current.walkDepth, LH - G - 6);
      people = Array.from({ length: LW < 200 ? 10 : 20 }, (_, i) => {
        const z = zones[i % 2];
        return {
          x: ri(z[0], z[1]), y: ri(G + 8, G + 8 + Math.max(3, depth)), dir: rnd() < 0.5 ? -1 : 1, v: 5 + rnd() * 9, z,
          skin: pick(SKINS), hair: pick(HAIRS), shirt: pick(SHIRTS), pant: pick(PANTS),
          kid: rnd() < 0.3, balloon: rnd() < 0.3 ? pick(BALLOONS) : null, pause: 0, ph: rnd() * 2,
        };
      });
    };

    const wheel = (t: number) => {
      // A modest wheel, so it stays below the title block and never outshines the balloon.
      const cx = c - 102, cy = G - 44, r = 26;
      line(cx, cy, cx - 16, G, P.wood); line(cx + 1, cy, cx - 15, G, P.wood);
      line(cx, cy, cx + 16, G, P.wood); line(cx - 1, cy, cx + 15, G, P.wood);
      line(cx - 11, G - 15, cx + 11, G - 15, P.wood);
      for (let a = 0; a < Math.PI * 2; a += 1 / r) {
        R(cx + r * Math.cos(a) + 0.5, cy + r * Math.sin(a) + 0.5, 1, 1, P.cream);
        R(cx + (r - 4) * Math.cos(a) + 0.5, cy + (r - 4) * Math.sin(a) + 0.5, 1, 1, '#e9d9ff');
      }
      const rot = t * 0.25;
      for (let i = 0; i < 8; i++) {
        const a = rot + (i * Math.PI) / 4;
        line(cx, cy, cx + r * Math.cos(a), cy + r * Math.sin(a), '#e9d9ff');
      }
      // Rim bulbs: a chase that brightens and dims smoothly instead of blinking.
      for (let i = 0; i < 16; i++) {
        const a = rot + (i * Math.PI) / 8;
        const glow = 0.5 + 0.5 * Math.sin(t * 5 - i * 0.8);
        ctx.globalAlpha = 0.35 + 0.65 * glow;
        M(cx + r * Math.cos(a), cy + r * Math.sin(a), 1, 1, '#ffe36b');
      }
      ctx.globalAlpha = 1;
      // Gondolas glide (screen-pixel placement) and always hang straight down.
      for (let i = 0; i < 8; i++) {
        const a = rot + (i * Math.PI) / 4;
        const gx = cx + r * Math.cos(a), gy = cy + r * Math.sin(a);
        M(gx, gy + 1, 1, 1, P.wood);
        M(gx - 2, gy + 2, 5, 1, P.dark);
        M(gx - 2, gy + 3, 5, 3, GOND[i]);
        M(gx - 1, gy + 3, 1, 1, P.cream);
      }
      R(cx - 1, cy - 1, 3, 3, '#ffd23f');
      R(cx, cy, 1, 1, P.dark);
    };

    const stall = (x: number, a: string, b: string, sign: string) => {
      R(x, G - 17, 2, 17, P.wood); R(x + 18, G - 17, 2, 17, P.wood);
      for (let i = 0; i < 22; i += 3) R(x - 1 + i, G - 22, 3, 5, (i / 3) % 2 ? b : a);
      for (let i = 0; i < 22; i += 6) R(x - 1 + i, G - 17, 3, 1, a);
      R(x + 4, G - 26, 12, 4, P.cream); R(x + 6, G - 25, 8, 2, sign);
      R(x, G - 8, 20, 8, a); R(x, G - 8, 20, 1, P.cream);
      ['#ffd23f', '#4fd1e8', '#8cf06a', '#ff6b8b', '#c58bff'].forEach((p, i) => R(x + 3 + i * 3, G - 11, 2, 3, p));
    };

    const tent = (t: number) => {
      const ax = c + 118, ay = G - 45;
      for (let y = ay; y <= G - 23; y++) {
        const hw = Math.round((y - ay) * 1.25) + 1;
        for (let x = ax - hw; x <= ax + hw; x++) R(x, y, 1, 1, Math.floor(((x - ax) / (y - ay + 1)) * 4 + 8) % 2 ? P.red : P.cream);
      }
      for (let x = ax - 28; x <= ax + 28; x++) {
        R(x, G - 22, 1, 22, Math.floor((x - ax + 28) / 4) % 2 ? P.cream : P.red);
        if ((x - ax + 28) % 4 < 2) R(x, G - 22, 1, 2, '#ffd23f');
      }
      for (let y = G - 15; y < G; y++) {
        const hw = Math.min(6, Math.floor((y - G + 17) * 1.2));
        R(ax - hw, y, hw * 2 + 1, 1, P.dark);
      }
      R(ax, ay - 10, 1, 10, P.wood);
      // The pennant ripples: its length eases in and out.
      const f = 0.5 + 0.5 * Math.sin(t * 5);
      R(ax + 1, ay - 10, 5, 2, '#ffd23f');
      M(ax + 1, ay - 8, 3 + f * 1.5, 1, '#ffd23f');
    };

    const lights = (x0: number, x1: number, y: number, sag: number, t: number, cols: string[]) => {
      R(x0, y, 1, G - y, P.wood); R(x1, y, 1, G - y, P.wood);
      for (let x = x0; x <= x1; x++) {
        const u = (x - x0) / (x1 - x0);
        const yy = Math.round(y + sag * 4 * u * (1 - u));
        R(x, yy, 1, 1, '#3d2a4f');
        if ((x - x0) % 4 === 2) {
          ctx.globalAlpha = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 3 + x * 0.9));
          R(x, yy + 1, 1, 1, cols[((x - x0) >> 2) % cols.length]);
          ctx.globalAlpha = 1;
        }
      }
    };

    const bunting = (x0: number, x1: number, y: number, sag: number, t: number) => {
      const cols = ['#ff6b8b', '#ffd23f', '#4fd1e8', '#8cf06a'];
      for (let x = x0; x <= x1; x++) {
        const u = (x - x0) / (x1 - x0);
        const yy = Math.round(y + sag * 4 * u * (1 - u));
        R(x, yy, 1, 1, '#3d2a4f');
        if ((x - x0) % 5 === 1) {
          const col = cols[(((x - x0) / 5) | 0) % 4];
          const sway = Math.sin(t * 2.2 + x * 0.5) * 0.4;
          M(x + sway, yy + 1, 3, 1, col);
          M(x + 1 + sway * 1.6, yy + 2, 1, 1, col);
        }
      }
    };

    const update = (p: Person, dt: number) => {
      if (p.pause > 0) {
        p.pause -= dt;
        if (p.pause <= 0 && Math.random() < 0.5) p.dir *= -1;
        return;
      }
      p.x += p.dir * p.v * dt;
      if (p.x < p.z[0]) { p.x = p.z[0]; p.dir = 1; }
      if (p.x > p.z[1]) { p.x = p.z[1]; p.dir = -1; }
      if (Math.random() < 0.12 * dt) p.pause = 1 + Math.random() * 2.5;
    };

    const person = (p: Person, t: number) => {
      const walking = p.pause <= 0;
      const fr = walking ? Math.floor(t * 7 + p.ph) % 2 : 1;
      // A soft step bob instead of a 1-art-pixel hop.
      const bob = walking ? Math.abs(Math.sin((t * 7 + p.ph) * Math.PI)) * 0.75 : 0;
      const x = p.x, y = p.y;
      const h = p.kid ? 7 : 9, top = y - h - bob;
      ctx.fillStyle = 'rgba(40,20,30,.35)';
      ctx.fillRect(Math.round((x - 1) * S) / S, Math.round(y), 5, 1);
      M(x, top, 3, 1, p.hair);
      M(x, top + 1, 3, p.kid ? 1 : 2, p.skin);
      M(x + (p.dir > 0 ? 2 : 0), top + 1, 1, 1, '#2a1a2a');
      const sh = p.kid ? 2 : 3, sy = top + (p.kid ? 2 : 3);
      M(x, sy, 3, sh, p.shirt);
      const legY = sy + sh;
      if (fr === 0) {
        M(x, legY, 1, y - legY, p.pant);
        M(x + 2, legY, 1, y - legY, p.pant);
      } else M(x + 1, legY, 1, y - legY, p.pant);
      if (p.balloon) {
        const hx = p.dir > 0 ? x - 1 : x + 3;
        const drift = Math.sin(t * 1.6 + p.ph * 3) * 0.6;
        M(hx, sy + 1, 1, 1, p.skin);
        M(hx + drift * 0.5, top - 5, 1, sy + 1 - (top - 5), '#f4f0ff');
        M(hx - 1 + drift, top - 8, 3, 3, p.balloon);
        M(hx - 1 + drift, top - 8, 1, 1, '#ffffff');
      }
    };

    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(cv);

    let last = performance.now();
    let t = 0;
    let raf = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const isActive = opts.current.active;
      if (!isActive || isActive()) {
        t += dt;
        ctx.setTransform(S * dpr, 0, 0, S * dpr, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, LW, Math.ceil(H / S));
        wheel(t);
        lights(c - 74, c - 42, G - 29, 6, t, ['#ffe36b', '#ff6b8b', '#4fd1e8']);
        stall(c - 68, '#ff6b8b', P.cream, '#4fd1e8');
        tent(t);
        bunting(c + 42, c + 90, G - 31, 5, t);
        R(c + 42, G - 31, 1, 31, P.wood);
        stall(c + 54, '#4fd1e8', P.cream, '#ff6b8b');
        if (ground) ctx.drawImage(ground, 0, 0);
        people.forEach((p) => update(p, dt));
        [...people].sort((a, b) => a.y - b.y).forEach((p) => person(p, t));
      }
      if (!reduced) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  // Dimmed a little so the fair stays background and the balloon stays the star.
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" style={{ filter: 'brightness(0.72) saturate(0.85)', imageRendering: 'pixelated' }} />;
}

/** The homepage's fairground: fills the scene, grass line at the horizon (70% on phones, 72% on desktop; matches --horizon). */
export function HomeFairground() {
  return <Fairground groundAt={(w, h) => h * (w < 768 ? 0.7 : 0.72)} walkDepth={10} />;
}

/** Ground depth below the grass line on the results page's landing strip, in screen px. */
export const LANDED_GROUND = 56;

/**
 * The results page's fairground strip: a smaller fair (2 px art pixels at every width, so the
 * result and the landing fit on one screen), grass line LANDED_GROUND above the strip's bottom.
 */
export function LandedFairground() {
  return <Fairground groundAt={(_, h) => h - LANDED_GROUND} walkDepth={8} artScale={() => 2} />;
}
