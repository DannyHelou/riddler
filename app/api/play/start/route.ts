import { startPlay } from '@/lib/game';
import { handle, requireDevice } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST() {
  return handle(async () => startPlay(await requireDevice()));
}
