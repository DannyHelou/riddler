import type { Metadata } from 'next';
import { Climb } from '@/components/Climb';

export const metadata: Metadata = { title: 'The climb · Riddler' };
export const dynamic = 'force-dynamic';

export default function PlayPage() {
  return <Climb />;
}
