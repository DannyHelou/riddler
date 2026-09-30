import { SPRITES, shadowOf, type PixelMap } from '@/lib/sprites';
import { Sprite } from './Sprite';
import { HomeFairground, LandedFairground } from './Fairground';

/*
 * The homepage scene (§5.2): a pixel dusk over a fairground. Stepped sky bands that deepen
 * toward night at the top (the climb goes up into the dark), moonlit chunky clouds, a pixel
 * moon, a faint altitude ruler on the right, and below the horizon the fair (`Fairground`),
 * with the balloon waiting on its launch pad in the clear center. The texture is pixel art;
 * the motion is fluid and stops under reduced motion.
 */

// Sky, top (night) to horizon (the climb's sea-level blue, then a thin lavender haze).
const SKY: [string, number][] = [
  ['#070B1C', 7],
  ['#0A1026', 7],
  ['#0D1531', 8],
  ['#111B3C', 8],
  ['#152247', 9],
  ['#192A53', 9],
  ['#1D325F', 10],
  ['#213B6C', 11],
  ['#24457A', 18],
  ['#2E5288', 5],
  ['#3D5C93', 3],
  ['#55669C', 2],
];




const CLOUD_PAL = { a: '#C6CFEF', b: '#98A5D2', c: '#6B79AB' };

const CLOUD_BIG: PixelMap = [
  '............aaaa..............',
  '..........aaaaaaaa............',
  '.........aaaaaaaaaa...aaaa....',
  '.....aaa.aaaaaaaaaaaaaaaaaaa..',
  '...aaaaaaaaaaaaaaaaaaaaaaaaaa.',
  '.aaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'bbbbaaaaaaabbbbaaaaaaaabbbbabb',
  'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  '..cccccccccccccccccccccccccc..',
];

const CLOUD_MID: PixelMap = [
  '........aaaaa.........',
  '......aaaaaaaaa.......',
  '..aaa.aaaaaaaaaaaa....',
  '.aaaaaaaaaaaaaaaaaaa..',
  'aaaaaaaaaaaaaaaaaaaaaa',
  'bbbaaaabbbbaaaaabbbbbb',
  '.bbbbbbbbbbbbbbbbbbbb.',
  '...cccccccccccccccc...',
];

/** A filled pixel disc of radius r in character `ch`. */
function disc(r: number, ch: string): PixelMap {
  const rows: string[] = [];
  for (let y = 0; y < 2 * r; y++) {
    let row = '';
    for (let x = 0; x < 2 * r; x++) {
      const dx = x + 0.5 - r;
      const dy = y + 0.5 - r;
      row += dx * dx + dy * dy <= r * r ? ch : '.';
    }
    rows.push(row);
  }
  return rows;
}

// The moon: a cream disc with a few craters and a shaded right edge.
const MOON: PixelMap = (() => {
  const rows = disc(7, 'm').map((r) => [...r]);
  const set = (x: number, y: number, c: string) => {
    if (rows[y]?.[x] && rows[y][x] !== '.') rows[y][x] = c;
  };
  rows.forEach((row, y) => {
    for (let x = row.length - 1; x >= 0; x--) {
      if (row[x] !== '.') {
        set(x, y, 's');
        if (y > 2 && y < 11) set(x - 1, y, 's');
        break;
      }
    }
  });
  [[4, 4], [5, 4], [4, 5], [8, 3], [9, 8], [10, 8], [9, 9], [5, 9], [3, 8]].forEach(([x, y]) => set(x, y, 'c'));
  return rows.map((r) => r.join(''));
})();
const MOON_PAL = { m: '#EFE8D4', c: '#D3CAAE', s: '#C2B899' };
const HALO_1 = disc(11, 'h');
const HALO_2 = disc(15, 'h');
const HALO_PAL = { h: 'rgba(239, 232, 212, 0.06)' };

function Px({ rows, s, pal, className, style }: { rows: PixelMap; s: number; pal: Record<string, string>; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={className} style={{ position: 'absolute', width: rows[0].length * s, height: rows.length * s, ...style }}>
      <div style={{ position: 'absolute', left: -s, top: -s, width: s, height: s, boxShadow: shadowOf(rows, s, pal) }} />
    </div>
  );
}

function stars(n: number, seed: number) {
  const out: { x: number; y: number; s: number; c: string }[] = [];
  let v = seed;
  const r = () => (v = (v * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < n; i++) out.push({ x: r() * 100, y: r() * 100, s: r() > 0.85 ? 4 : 2, c: i % 9 === 0 ? '#F0C674' : '#C9D3FF' });
  return out;
}

// Ruler marks from the horizon (0 m) up to 100 km, on the climb's square-root scale.
const RULER_TOP_M = 100_000;
const MARKS: { m: number; label?: string }[] = [
  { m: 0, label: '0 m' },
  { m: 100 },
  { m: 250 },
  { m: 500 },
  { m: 1_000, label: '1 km' },
  { m: 2_500 },
  { m: 5_000 },
  { m: 10_000, label: '10 km' },
  { m: 25_000 },
  { m: 50_000 },
  { m: 100_000, label: '100 km' },
];

function Ruler() {
  return (
    <div className="home-ruler absolute right-[6px] md:right-[14px]">
      <div className="absolute top-0 right-0 bottom-0 w-[2px] bg-[#26325A]" />
      {MARKS.map(({ m, label }) => {
        const k = Math.sqrt(m / RULER_TOP_M);
        return (
          <div key={m} className="absolute right-0" style={{ top: `${(1 - k) * 100}%` }}>
            <div className="absolute right-0 h-[2px] bg-[#26325A]" style={{ width: label ? 10 : 6 }} />

          </div>
        );
      })}
    </div>
  );
}

/** The balloon with its idle pilot light (§5.4.1): two blue pixels under the envelope, flickering. */
function Balloon({ scale }: { scale: number }) {
  return (
    <div className="relative" style={{ width: 16 * scale, height: 16 * scale }}>
      <Sprite rows={SPRITES.balloon.rows} scale={scale} />
      {[7, 8].map((x) => (
        <div key={x} className="idle-pilot absolute" style={{ left: x * scale, top: 13 * scale, width: scale, height: scale, background: '#6FB7FF' }} />
      ))}
    </div>
  );
}

// Positions as [left, top] on desktop, then on phones.
const CLOUDS: { rows: PixelMap; at: [string, string]; phone: [string, string]; o: number; d: number }[] = [
  { rows: CLOUD_BIG, at: ['7%', '6%'], phone: ['-4%', '5%'], o: 0.85, d: 0 },
  { rows: CLOUD_MID, at: ['54%', '10%'], phone: ['17%', '1%'], o: 0.8, d: -40 },
  { rows: CLOUD_MID, at: ['-3%', '30%'], phone: ['-8%', '37%'], o: 0.7, d: -70 },
  { rows: CLOUD_BIG, at: ['83%', '34%'], phone: ['80%', '40%'], o: 0.75, d: -20 },
  { rows: SPRITES.cloud, at: ['64%', '47%'], phone: ['66%', '47%'], o: 0.45, d: -55 },
];

/**
 * The dusk sky shared by the start page and the results page: stepped bands deepening to
 * night at the top, stars, the moon with its halo, and slow clouds. `skyClass` sets how far
 * down the bands reach (the homepage stops them at the horizon; the results page fills).
 */
export function DuskSky({ skyClass = 'absolute inset-0', moonClass = '' }: { skyClass?: string; moonClass?: string }) {
  const st = stars(46, 7);
  return (
    <>
      <div className={`${skyClass} flex flex-col`}>
        {SKY.map(([c, w]) => (
          <div key={c} style={{ background: c, flexGrow: w }} />
        ))}
      </div>
      <div className="absolute top-0 right-0 left-0 h-[42%]">
        {st.map((s, i) => (
          <div
            key={i}
            className={`absolute ${i % 5 === 0 ? 'idle-twinkle' : ''}`}
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, background: s.c, opacity: 0.25 + (1 - s.y / 100) * 0.6, animationDelay: `${-(i * 797) % 4500}ms` }}
          />
        ))}
      </div>

      {/* Moon, top right, with a stepped halo. */}
      <div className={`home-moon absolute ${moonClass}`}>
        <div className="relative hidden md:block">
          <Px rows={HALO_2} s={6} pal={HALO_PAL} style={{ left: -48, top: -48 }} />
          <Px rows={HALO_1} s={6} pal={HALO_PAL} style={{ left: -24, top: -24 }} />
          <Px rows={MOON} s={6} pal={MOON_PAL} style={{ left: 24, top: 24 }} />
        </div>
        <div className="relative md:hidden">
          <Px rows={HALO_2} s={4} pal={HALO_PAL} style={{ left: -32, top: -32 }} />
          <Px rows={HALO_1} s={4} pal={HALO_PAL} style={{ left: -16, top: -16 }} />
          <Px rows={MOON} s={4} pal={MOON_PAL} style={{ left: 16, top: 16 }} />
        </div>
      </div>

      {/* Clouds */}
      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="home-cloud absolute"
          style={{ '--x': c.at[0], '--y': c.at[1], '--px': c.phone[0], '--py': c.phone[1], opacity: c.o, animationDelay: `${c.d}s` } as React.CSSProperties}
        >
          <Px rows={c.rows} s={6} pal={CLOUD_PAL} className="!hidden md:!block" />
          <Px rows={c.rows} s={4} pal={CLOUD_PAL} className="md:!hidden" />
        </div>
      ))}
    </>
  );
}

export function HomeSky() {
  return (
    <div role="img" aria-label="A night fairground with a ferris wheel, stalls and a tent, and a pixel balloon waiting on its launch pad" className="home-scene absolute inset-0 overflow-hidden">
      <DuskSky skyClass="home-sky absolute top-0 right-0 left-0" />

      <Ruler />

      {/* The fairground below the horizon (after the owner's reference): the balloon waits on its launch pad. */}
      <HomeFairground />

      {/* The balloon, centered, resting on the launch pad. */}
      <div className="home-balloon absolute left-1/2 -translate-x-1/2">
        <div className="sky-balloon">
          <div className="idle-bob">
            <div className="md:hidden">
              <Balloon scale={4} />
            </div>
            <div className="hidden md:block">
              <Balloon scale={6} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The results page's landing strip (§5.5): the fairground along the bottom, with your balloon
 * back on its launch pad. Fills its (relatively positioned) parent.
 */
export function LandedScene() {
  return (
    <div aria-hidden="true" className="absolute inset-0">
      <LandedFairground />
      <div className="landed-balloon absolute left-1/2 -translate-x-1/2">
        <div className="idle-bob">
          <Balloon scale={4} />
        </div>
      </div>
    </div>
  );
}
