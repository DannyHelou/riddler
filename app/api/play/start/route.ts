import { startPlay } from '@/lib/game';
import { rateLimit } from '@/lib/ratelimit';
import { handle, requireDevice } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST() {
  return handle(async () => {
    await rateLimit('start');
    return startPlay(await requireDevice());
  });
}
