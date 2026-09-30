'use client';
import { Modal } from './Modal';
import { Sprite } from './Sprite';
import { SPRITES } from '@/lib/sprites';

const STEPS = [
  'Three riddles a day. Same for everyone.',
  "Each one has a trap: an answer that feels right but isn't.",
  'For number answers, the closer you get, the higher you climb, from Goldfish (grey) to Oracle (red).',
  'Fast, close answers score more.',
  'At the end, see your RQ against everyone who played today.',
];

export function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="How to play" onClose={onClose}>
      <ol className="m-0 flex list-none flex-col gap-3 p-0 text-[20px] leading-[1.3]">
        {STEPS.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="shrink-0 text-haze" aria-hidden="true">{i + 1}.</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <div className="dash-top mt-5 flex flex-wrap items-center gap-3 pt-4 text-[18px] text-haze">
        {(['goldfish', 'guesser_dice', 'analyst_bars', 'quant_line', 'genius_brain', 'oracle_ball'] as const).map((k) => (
          <Sprite key={k} rows={SPRITES.levels[k]} scale={2} />
        ))}
        <span>Goldfish, Guesser, Analyst, Quant, Genius, Oracle</span>
      </div>
      <p className="mt-3 mb-0 text-[18px] leading-[1.3] text-haze">Type your answer and press Enter to fire the burner. Your RQ (riddle quotient) compares you with today&apos;s players only.</p>
      <div className="mt-6 flex justify-end">
        <button type="button" className="btn-primary" onClick={onClose}>Got it</button>
      </div>
    </Modal>
  );
}
