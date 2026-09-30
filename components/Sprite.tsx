import { shadowOf, type PixelMap } from '@/lib/sprites';
import type { CSSProperties } from 'react';

/** A pixel map drawn as a single element with one hard box-shadow per pixel. No smoothing. */
export function Sprite({ rows, scale, className, style, label }: { rows: PixelMap; scale: number; className?: string; style?: CSSProperties; label?: string }) {
  return (
    <div
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ position: 'relative', width: rows[0].length * scale, height: rows.length * scale, flexShrink: 0, ...style }}
    >
      <div style={{ position: 'absolute', left: -scale, top: -scale, width: scale, height: scale, boxShadow: shadowOf(rows, scale) }} />
    </div>
  );
}
