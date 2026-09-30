import { getResults } from '@/lib/game';
import { handle, requireDevice } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => getResults(await requireDevice()));
}
