/** Pixel maps from design/sprites.json, plus helpers to draw them as box-shadows (§6.3–6.4). */
import sprites from '../design/sprites.json';
import world from '../design/world.json';

export type PixelMap = string[];
export const PALETTE: Record<string, string> = sprites.palette;
export const SPRITES = sprites;
export const WORLD = world;

/** 8×8 balloon used for the wordmark and small marks (from the design boards). */
export const MINI_BALLOON: PixelMap = ['..ryyr..', '.rryyrr.', 'rrryyrrr', 'rrryyrrr', '.rryyrr.', '..w..w..', '..bbbb..', '..bbbb..'];

export const LEVEL_SPRITE: Record<string, PixelMap> = {
  Goldfish: sprites.levels.goldfish,
  Guesser: sprites.levels.guesser_dice,
  Analyst: sprites.levels.analyst_bars,
  Quant: sprites.levels.quant_line,
  Genius: sprites.levels.genius_brain,
  Oracle: sprites.levels.oracle_ball,
};

export const LANDMARK_SPRITE: Record<string, PixelMap> = sprites.landmarks;

/** One CSS box-shadow list, one shadow per pixel, offset by one pixel (the host element is the -1,-1 pixel). */
export function shadowOf(rows: PixelMap, s: number, palette: Record<string, string> = PALETTE): string {
  const out: string[] = [];
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const c = palette[ch];
      if (c) out.push(`${(x + 1) * s}px ${(y + 1) * s}px 0 0 ${c}`);
    });
  });
  return out.join(',');
}

/** Ambient flyers that cross the climb now and then, one per altitude band (drawn in `l`, faded). */
export const FLYER_SPRITE: Record<'gull' | 'plane' | 'satellite', PixelMap> = {
  gull: ['.l....l.', 'l.l..l.l', '...ll...'],
  plane: ['l.......l...', 'll...lllll..', 'llllllllllll', '.....ll.....'],
  satellite: ['vv.ll.vv', 'vvllllvv', 'vv.ll.vv'],
};

/** 8×8 speaker for the mute toggle. */
export const SPEAKER_ON: PixelMap = ['...l....', '..ll..l.', 'llll.l.l', 'llll.l.l', 'llll.l.l', 'llll.l.l', '..ll..l.', '...l....'];
export const SPEAKER_OFF: PixelMap = ['...l....', '..ll....', 'llll.r.r', 'llll..r.', 'llll..r.', 'llll.r.r', '..ll....', '...l....'];
