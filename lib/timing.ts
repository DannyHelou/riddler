/**
 * Fuel grace (§5.3, §7.7): a riddle's clock starts this long after it is first served,
 * so the pan-up and the "fuel starts in 2…1" countdown never cost the player time.
 */
import { PAN_MS } from './burner';

export const FUEL_GRACE_MS = PAN_MS + 1500;
