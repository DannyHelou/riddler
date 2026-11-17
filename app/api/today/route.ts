import { getToday } from '@/lib/game';
import { rateLimit } from '@/lib/ratelimit';
import { handle, requireDevice } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    await rateLimit('today');
    return getToday(await requireDevice());
  });
}
