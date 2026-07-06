import type { CarFrame, Frame, Replay } from '@f1pitwall/shared';

/**
 * A car's state sampled at an arbitrary time. Continuous fields (x, y) are
 * linearly interpolated between the two bracketing frames for smooth motion;
 * discrete fields (position, status, compound, gaps) are taken from the "floor"
 * frame because interpolating them is meaningless.
 */
export interface SampledCar extends CarFrame {
  x: number;
  y: number;
}

export interface SampledFrame {
  t: number;
  lap: number;
  raceTime: string;
  cars: SampledCar[];
}

/** Total playback duration in seconds (time of the last frame). */
export function replayDuration(replay: Replay): number {
  const frames = replay.frames;
  return frames.length > 0 ? frames[frames.length - 1]!.t : 0;
}

/**
 * Binary-search the frame whose `t` is the greatest value <= `time`.
 * Returns the floor index, clamped to a valid range.
 */
export function findFloorIndex(frames: Frame[], time: number): number {
  if (frames.length === 0) return 0;
  let lo = 0;
  let hi = frames.length - 1;
  if (time <= frames[0]!.t) return 0;
  if (time >= frames[hi]!.t) return hi;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (frames[mid]!.t <= time) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

function lerp(a: number, b: number, alpha: number): number {
  return a + (b - a) * alpha;
}

/**
 * Sample the whole field at `time`, interpolating car positions between frames.
 * Cars are matched by `driverNumber`; a car missing from the next frame keeps
 * its floor-frame position (graceful degradation).
 */
export function sampleReplay(replay: Replay, time: number): SampledFrame {
  const frames = replay.frames;
  const floorIndex = findFloorIndex(frames, time);
  const floor = frames[floorIndex]!;
  const next = frames[Math.min(floorIndex + 1, frames.length - 1)];

  const span = next && next.t > floor.t ? next.t - floor.t : 0;
  const alpha = span > 0 ? Math.min(Math.max((time - floor.t) / span, 0), 1) : 0;

  const nextByDriver = new Map<string, CarFrame>();
  if (next) for (const car of next.cars) nextByDriver.set(car.driverNumber, car);

  const cars: SampledCar[] = floor.cars.map((car) => {
    const to = nextByDriver.get(car.driverNumber);
    if (!to || alpha === 0) return { ...car };
    return { ...car, x: lerp(car.x, to.x, alpha), y: lerp(car.y, to.y, alpha) };
  });

  return { t: time, lap: floor.lap, raceTime: floor.raceTime, cars };
}
