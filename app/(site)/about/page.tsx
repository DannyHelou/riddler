import type { Metadata } from 'next';
import { Prose } from '@/components/Prose';

export const metadata: Metadata = { title: 'About · Riddler' };

export default function AboutPage() {
  return (
    <Prose title="About Riddler">
      <p className="m-0">Riddler is three math riddles a day, the same for everyone. Each riddle has a trap: an answer that feels right but isn&apos;t.</p>
      <p className="m-0">You play from a pixel hot-air balloon. Every answer fires the burner: the closer you are, the bigger the flame and the higher you climb, from Goldfish to Oracle.</p>
      <p className="m-0">Once you land, you see how everyone else did and where your score for the day sits among today&apos;s players, as a percentage: top 10% means you beat 90% of them.</p>
      <p className="m-0 text-haze">Every probability riddle is checked with a million-trial simulation before it goes live.</p>
    </Prose>
  );
}
