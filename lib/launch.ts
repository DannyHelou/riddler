/**
 * The homepage → climb handoff (§5.2). The homepage pans until the balloon sits where the climb's
 * Balloon shot puts it, then the browser cross-fades (View Transitions) into the climb, which
 * fires CLIMB_READY once its first frame is drawn so the cross-fade lands on the real scene.
 */
export const CLIMB_READY = 'riddler:climb-ready';

/** Run `navigate`, cross-fading from the current frame to the climb's first frame when supported. */
export function crossFadeToClimb(navigate: () => void, timeoutMs = 2500) {
  if (typeof document.startViewTransition !== 'function') {
    navigate();
    return;
  }
  document.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        const done = () => {
          window.removeEventListener(CLIMB_READY, done);
          clearTimeout(timer);
          resolve();
        };
        // Never hold the old frame for long (a cold dev compile, a redirect to the results).
        const timer = window.setTimeout(done, timeoutMs);
        window.addEventListener(CLIMB_READY, done);
        navigate();
      }),
  );
}
