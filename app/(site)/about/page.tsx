import type { Metadata } from 'next';
import { Prose } from '@/components/Prose';

export const metadata: Metadata = { title: 'About · Riddler' };

export default function AboutPage() {
  return (
    <Prose title="About Riddler">
      <p className="m-0">Riddler is three math riddles a day, the same for everyone. Each riddle has a trap: an answer that feels right but isn&apos;t.</p>
      <p className="m-0">You play from a pixel hot-air balloon. Every answer fires the burner: the closer you are, the bigger the flame and the higher you climb, from Goldfish to Oracle.</p>
      <p className="m-0">Once you land, you see how everyone else did and your RQ (riddle quotient) for the day. RQ is a playful rescaling of today&apos;s rank: 100 is the middle of today&apos;s players, and it says nothing about anything else.</p>
      <p className="m-0 text-haze">Every probability riddle is checked with a million-trial simulation before it goes live.</p>
    </Prose>
  );
}
