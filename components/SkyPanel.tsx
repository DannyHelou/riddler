import tokens from '@/design/tokens.json';
import { SPRITES } from '@/lib/sprites';
import { Sprite } from './Sprite';

function stars(n: number, w: number, h: number, seed: number) {
  const out: { x: number; y: number; s: number; c: string }[] = [];
  let v = seed;
  const r = () => (v = (v * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < n; i++) out.push({ x: Math.floor((r() * w) / 4) * 4, y: Math.floor((r() * h) / 4) * 4, s: r() > 0.85 ? 4 : 2, c: i % 9 === 0 ? '#F0C674' : '#C9D3FF' });
  return out;
}

/** The balloon with its idle pilot light (§5.4.1): two blue pixels under the envelope, flickering. */
function SkyBalloon({ scale, className }: { scale: number; className: string }) {
  return (
    <div className={`relative ${className}`} style={{ width: 16 * scale, height: 16 * scale }}>
      <Sprite rows={SPRITES.balloon.rows} scale={scale} />
      {[7, 8].map((x) => (
        <div key={x} className="idle-pilot absolute" style={{ left: x * scale, top: 13 * scale, width: scale, height: scale, background: '#6FB7FF' }} />
      ))}
    </div>
  );
}

/**
 * Homepage sky: flat stepped bands from sea level to orbit, a few stars, one slow cloud,
 * and the balloon waiting at sea level, horizontally centered (§5.2, §6.6). Always at night.
 * Nothing in it asks to be read: it sets the mood. Still under reduced motion.
 */
export function SkyPanel() {
  const zones = tokens.zones;
  const st = stars(22, 340, 200, 5);
  return (
    <div
      role="img"
      aria-label="A night sky over the sea, with a pixel balloon waiting at sea level"
      className="relative flex h-[260px] flex-col overflow-hidden md:h-[420px]"
    >
      {zones.map((z) => (
        <div key={z.level} className="flex-1" style={{ background: z.color }} />
      ))}
      <div className="pointer-events-none absolute inset-0">
        {st.map((s, i) => (
          <div
            key={i}
            className={`absolute ${i % 5 === 0 ? 'idle-twinkle' : ''}`}
            style={{ left: 10 + s.x, top: 8 + s.y, width: s.s, height: s.s, background: s.c, opacity: 0.8, animationDelay: `${-(i * 797) % 4500}ms` }}
          />
        ))}
        <div className="idle-drift absolute left-0" style={{ top: '58%', opacity: 0.3 }}>
          <Sprite rows={SPRITES.cloud} scale={6} />
        </div>
        <div className="absolute bottom-[18px] left-1/2 -translate-x-1/2">
          <div className="sky-balloon">
            <div className="idle-bob">
              <SkyBalloon scale={3} className="md:!hidden" />
              <SkyBalloon scale={4} className="!hidden md:!block" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
