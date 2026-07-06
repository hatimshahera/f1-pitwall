import type { CarStatus, CarTrack, Replay, TyreCompound } from '@f1pitwall/shared';
import { formatClock } from './format';

/**
 * A car's state sampled at an arbitrary time. Continuous fields (x, y) are
 * linearly interpolated between the two bracketing frames for smooth motion;
 * discrete fields (position, status, compound, gaps) are taken from the "floor"
 * frame because interpolating them is meaningless.
 */
export interface SampledCar {
  driverNumber: string;
  x: number;
  y: number;
  position: number;
  gapToLeader: number | null;
  interval: number | null;
  status: CarStatus;
  compound: TyreCompound | null;
}

export interface SampledFrame {
  t: number;
  lap: number;
  raceTime: string;
  cars: SampledCar[];
}

/** Total playback duration in seconds (time of the last frame). */
export function replayDuration(replay: Replay): number {
  const t = replay.timeline.t;
  return t.length > 0 ? t[t.length - 1]! : 0;
}

/**
 * Binary-search the frame whose time is the greatest value <= `time`.
 * Returns the floor index, clamped to a valid range.
 */
export function findFloorIndex(times: number[], time: number): number {
  if (times.length === 0) return 0;
  let lo = 0;
  let hi = times.length - 1;
  if (time <= times[0]!) return 0;
  if (time >= times[hi]!) return hi;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (times[mid]! <= time) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

function lerp(a: number, b: number, alpha: number): number {
  return a + (b - a) * alpha;
}

/**
 * Resolve a change-segment value at frame `index`: the value of the last segment
 * whose start frame is <= index. Segments are sorted and start at frame 0.
 */
function segmentValueAt<T>(segments: Array<[number, T]>, index: number): T | null {
  let value: T | null = segments.length > 0 ? segments[0]![1] : null;
  for (const [start, v] of segments) {
    if (start <= index) value = v;
    else break;
  }
  return value;
}

/**
 * Sample the whole field at `time`, interpolating car positions between frames.
 */
export function sampleReplay(replay: Replay, time: number): SampledFrame {
  const times = replay.timeline.t;
  const floor = findFloorIndex(times, time);
  const next = Math.min(floor + 1, times.length - 1);

  const span = times[next]! - times[floor]!;
  const alpha = span > 0 ? Math.min(Math.max((time - times[floor]!) / span, 0), 1) : 0;

  const cars: SampledCar[] = replay.cars.map((car: CarTrack) => ({
    driverNumber: car.driverNumber,
    x: alpha === 0 ? car.x[floor]! : lerp(car.x[floor]!, car.x[next]!, alpha),
    y: alpha === 0 ? car.y[floor]! : lerp(car.y[floor]!, car.y[next]!, alpha),
    position: car.position[floor]!,
    gapToLeader: car.gapToLeader ? (car.gapToLeader[floor] ?? null) : null,
    interval: car.interval ? (car.interval[floor] ?? null) : null,
    status: segmentValueAt(car.statusSegments, floor) ?? 'UNKNOWN',
    compound: segmentValueAt(car.compoundSegments, floor),
  }));

  return {
    t: time,
    lap: replay.timeline.lap[floor] ?? 0,
    raceTime: formatClock(times[floor]!),
    cars,
  };
}
