import type { Metadata } from 'next';
import { Results } from '@/components/Results';

export const metadata: Metadata = { title: 'Your results · Riddler' };
export const dynamic = 'force-dynamic';

export default function ResultsPage() {
  return <Results />;
}
