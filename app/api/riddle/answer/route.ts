import { submitAnswer, GameError, isSlot } from '@/lib/game';
import { handle, readJson, requireDevice } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return handle(async () => {
    const { slot, input } = await readJson(req);
    if (!isSlot(slot)) throw new GameError(400, 'Bad slot');
    if (input !== null && typeof input !== 'string') throw new GameError(400, 'Bad input');
    if (typeof input === 'string' && input.length > 200) throw new GameError(400, 'That answer is too long', { reason: 'That answer is too long' });
    return submitAnswer(await requireDevice(), slot, input);
  });
}
