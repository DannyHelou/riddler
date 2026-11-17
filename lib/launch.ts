/**
 * Scene handoffs (§5.2, §5.3). Homepage → climb: the homepage pans until the balloon sits where
 * the climb's Balloon shot puts it, then the browser cross-fades (View Transitions) into the climb,
 * which fires CLIMB_READY once its first frame is drawn. Climb → results: after the balloon lands
 * on its pad, the climb cross-fades into the results page, which fires RESULTS_READY once your
 * result is on screen. No fade through black either way.
 */
export const CLIMB_READY = 'riddler:climb-ready';
export const RESULTS_READY = 'riddler:results-ready';

/** Run `navigate`, cross-fading from the current frame to the new page once it fires `readyEvent`. */
export function crossFadeTo(navigate: () => void, readyEvent: string, timeoutMs = 2500) {
  if (typeof document.startViewTransition !== 'function') {
    navigate();
    return;
  }
  document.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        const done = () => {
          window.removeEventListener(readyEvent, done);
          clearTimeout(timer);
          resolve();
        };
        // Never hold the old frame for long (a cold dev compile, a slow network, a redirect).
        const timer = window.setTimeout(done, timeoutMs);
        window.addEventListener(readyEvent, done);
        navigate();
      }),
  );
}

/** Homepage → climb. */
export function crossFadeToClimb(navigate: () => void, timeoutMs = 2500) {
  crossFadeTo(navigate, CLIMB_READY, timeoutMs);
}
