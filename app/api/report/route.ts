import { reportVerdict, GameError, isSlot } from '@/lib/game';
import { rateLimit } from '@/lib/ratelimit';
import { handle, readJson, requireDevice } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return handle(async () => {
    await rateLimit('report');
    const { slot } = await readJson(req);
    if (!isSlot(slot)) throw new GameError(400, 'Bad slot');
    return reportVerdict(await requireDevice(), slot);
  });
}
