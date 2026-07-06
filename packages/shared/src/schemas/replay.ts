import { z } from 'zod';
import {
  boundsSchema,
  carStatusSchema,
  hexColorSchema,
  isoDateSchema,
  pointSchema,
  sessionCodeSchema,
  tyreCompoundSchema,
} from './common';

/**
 * The replay JSON contract (schemaVersion "2.0").
 *
 * A replay is a precomputed, uniform-timeline animation stored in a
 * **structure-of-arrays** layout: one shared `timeline`, and one `CarTrack` per
 * driver holding parallel typed arrays (x, y, position, …) indexed by frame.
 * This keeps full real races compact (no per-frame key repetition). The browser
 * interpolates car positions between frames for smooth motion. See
 * docs/data-contract.md.
 */

export const replayMetaSchema = z.object({
  schemaVersion: z.string(),
  year: z.number().int(),
  raceName: z.string(),
  session: sessionCodeSchema,
  /** Frames-per-second the timeline was sampled at (used for playback math). */
  frameRate: z.number().positive(),
  generatedAt: isoDateSchema,
  dataSources: z.array(z.string()).min(1),
  disclaimer: z.string(),
});

export const trackSchema = z.object({
  name: z.string(),
  /** Ordered centerline (racing line) polyline in world-coordinates. */
  points: z.array(pointSchema).min(2),
  bounds: boundsSchema,
  /** Rotation (radians) applied about the bounds center for correct framing. */
  rotation: z.number().nullable().optional(),
  /** Total track width in world units, used to draw the boundary ribbon. */
  width: z.number().positive(),
});

export const replayDriverSchema = z.object({
  driverNumber: z.string(),
  code: z.string(),
  name: z.string(),
  team: z.string(),
  color: hexColorSchema,
});

/** The shared, uniform time grid every car track is indexed against. */
export const timelineSchema = z.object({
  /** Seconds from the start of the replay; strictly increasing, length = frames. */
  t: z.array(z.number()).min(1),
  /** Global leader lap per frame; same length as `t`. */
  lap: z.array(z.number().int().nonnegative()),
});

/** `[startFrameIndex, value]` — the value applies until the next segment. */
export const statusSegmentSchema = z.tuple([z.number().int().nonnegative(), carStatusSchema]);
export const compoundSegmentSchema = z.tuple([
  z.number().int().nonnegative(),
  tyreCompoundSchema.nullable(),
]);

/**
 * One driver's whole race as parallel arrays indexed by frame. Continuous
 * fields (`x`, `y`) are dense; slowly-changing fields (`status`, `compound`) are
 * stored as sparse change-segments to save space.
 */
export const carTrackSchema = z.object({
  driverNumber: z.string(),
  x: z.array(z.number()),
  y: z.array(z.number()),
  position: z.array(z.number().int().positive()),
  /** Optional dense timing arrays (null/absent when unavailable). */
  gapToLeader: z.array(z.number().nullable()).nullable().optional(),
  interval: z.array(z.number().nullable()).nullable().optional(),
  /** Running status as change-segments; first segment starts at frame 0. */
  statusSegments: z.array(statusSegmentSchema).min(1),
  /** Tyre compound as change-segments; first segment starts at frame 0. */
  compoundSegments: z.array(compoundSegmentSchema).min(1),
});

export const replaySchema = z
  .object({
    meta: replayMetaSchema,
    track: trackSchema,
    drivers: z.array(replayDriverSchema).min(1),
    timeline: timelineSchema,
    cars: z.array(carTrackSchema).min(1),
  })
  .superRefine((replay, ctx) => {
    // Enforce that every parallel array matches the timeline length — the core
    // invariant that makes frame indexing safe on the consumer side.
    const n = replay.timeline.t.length;
    const check = (arr: unknown[] | null | undefined, path: (string | number)[]) => {
      if (arr && arr.length !== n) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path,
          message: `array length ${arr.length} does not match timeline length ${n}`,
        });
      }
    };
    check(replay.timeline.lap, ['timeline', 'lap']);
    replay.cars.forEach((car, i) => {
      check(car.x, ['cars', i, 'x']);
      check(car.y, ['cars', i, 'y']);
      check(car.position, ['cars', i, 'position']);
      check(car.gapToLeader, ['cars', i, 'gapToLeader']);
      check(car.interval, ['cars', i, 'interval']);
    });
  });

export type ReplayMeta = z.infer<typeof replayMetaSchema>;
export type Track = z.infer<typeof trackSchema>;
export type ReplayDriver = z.infer<typeof replayDriverSchema>;
export type Timeline = z.infer<typeof timelineSchema>;
export type StatusSegment = z.infer<typeof statusSegmentSchema>;
export type CompoundSegment = z.infer<typeof compoundSegmentSchema>;
export type CarTrack = z.infer<typeof carTrackSchema>;
export type Replay = z.infer<typeof replaySchema>;
