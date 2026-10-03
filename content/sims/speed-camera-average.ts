/** Verifies speed-camera-average: average speed of vehicles passing a fixed camera when bikes (20) and cars (100) are equally common on the road. */
export const expected = 86.67; // km/h
export const kind = 'expectation' as const; // tolerance ±1% relative

const ROAD = 1000; // km of road behind the camera
const HOURS = 1; // logging window

export function simulate(): number | null {
  // A random vehicle on the road at time 0: equally likely bike or car, uniform position.
  const speed = Math.random() < 0.5 ? 20 : 100;
  const distanceToCamera = Math.random() * ROAD;
  if (distanceToCamera > speed * HOURS) return null; // doesn't reach the camera in the window
  return speed;
}
