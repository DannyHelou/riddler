import type { Metadata } from 'next';
import { Prose } from '@/components/Prose';

export const metadata: Metadata = { title: 'Privacy · Riddler' };

export default function PrivacyPage() {
  return (
    <Prose title="Privacy">
      <p className="m-0">There are no accounts. Your browser gets a random device ID in a cookie so we can keep one play per day, your streak, and your stats.</p>
      <p className="m-0">We store your answers to score them and to show everyone the anonymous crowd charts after they finish.</p>
      <p className="m-0">Analytics events never include your device ID or the text of your answers.</p>
    </Prose>
  );
}
