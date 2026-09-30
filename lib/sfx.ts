'use client';
/**
 * Sound effects (§6.8): synthesized with WebAudio, no audio files. Quiet, short, soft
 * (triangle and sine tones, no harsh square or sawtooth waves), and silent until the
 * first user gesture unlocks the AudioContext. Muting is per device.
 */

const KEY = 'burner_muted';
let ctx: AudioContext | null = null;
let muted: boolean | null = null;
const listeners = new Set<() => void>();

export function isMuted(): boolean {
  if (muted === null) {
    try {
      muted = localStorage.getItem(KEY) === '1';
    } catch {
      muted = false;
    }
  }
  return muted;
}

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem(KEY, m ? '1' : '0');
  } catch {
    /* private mode */
  }
  listeners.forEach((l) => l());
}

export function subscribeMuted(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Call from a user gesture (click, key press): browsers only allow audio after one. */
export function unlockAudio() {
  if (typeof window === 'undefined') return;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

function ready(): AudioContext | null {
  if (!ctx || isMuted() || ctx.state !== 'running') return null;
  return ctx;
}

const MASTER = 0.9;

function tone(freq: number, durMs: number, opts: { type?: OscillatorType; gain?: number; at?: number; to?: number } = {}) {
  const c = ready();
  if (!c) return;
  const t0 = c.currentTime + (opts.at ?? 0) / 1000;
  const dur = durMs / 1000;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? 'triangle';
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
  const peak = (opts.gain ?? 0.04) * MASTER;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(durMs: number, opts: { gain?: number; freq?: number; at?: number } = {}) {
  const c = ready();
  if (!c) return;
  const t0 = c.currentTime + (opts.at ?? 0) / 1000;
  const dur = durMs / 1000;
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(opts.freq ?? 500, t0);
  filter.frequency.exponentialRampToValueAtTime((opts.freq ?? 500) * 1.8, t0 + dur);
  filter.Q.value = 0.8;
  const g = c.createGain();
  const peak = (opts.gain ?? 0.12) * MASTER;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.15, dur / 3));
  g.gain.setValueAtTime(peak, t0 + Math.max(0.15, dur - 0.4));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

export const sfx = {
  /** Primary button press. */
  click() {
    tone(660, 60, { type: 'sine', gain: 0.03 });
  },
  /** The burner: length and loudness follow the burn (§5.4.1: 300 + 1200c ms, peak 0.15 + 0.85c). */
  burner(c: number) {
    const burnMs = 300 + 1200 * c;
    noise(burnMs + 400, { gain: 0.05 + 0.13 * (0.15 + 0.85 * c), freq: 350 + 400 * c });
  },
  /** Result sting, pitched by closeness. */
  reveal(c: number, trapped: boolean) {
    if (trapped) {
      tone(220, 160, { type: 'triangle', gain: 0.05 });
      tone(185, 280, { type: 'triangle', gain: 0.05, at: 170 });
      return;
    }
    if (c < 0.2) {
      tone(140, 260, { type: 'triangle', gain: 0.07, to: 90 });
      return;
    }
    const base = 392 + 260 * c; // G4 upwards
    tone(base, 90, { gain: 0.03 });
    tone(base * 1.26, 90, { gain: 0.03, at: 90 });
    tone(base * 1.5, c >= 0.8 ? 260 : 140, { gain: 0.035, at: 180 });
  },
  /** Last five seconds of fuel. */
  tick() {
    tone(880, 40, { type: 'sine', gain: 0.02 });
  },
  /** Passing a landmark on the way up. */
  landmark() {
    tone(880, 60, { type: 'triangle', gain: 0.04, to: 1320 });
  },
  /** The fuel lights after the ignite countdown. */
  ignite() {
    noise(160, { gain: 0.05, freq: 900 });
  },
};
