import type { Metadata } from 'next';
import { Prose } from '@/components/Prose';

export const metadata: Metadata = { title: 'Contact · Riddler' };

export default function ContactPage() {
  return (
    <Prose title="Contact">
      <p className="m-0">Found a riddle that&apos;s ambiguous, or an answer we got wrong? Use &quot;Report it&quot; on the results page, or write to us.</p>
      <p className="m-0 text-haze">hello@riddler.example</p>
    </Prose>
  );
}
