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
 * The replay JSON contract (schemaVersion "1.0").
 *
 * A replay is a precomputed, uniform-timeline animation: every car is sampled
 * onto the same set of frame timestamps so the browser can play them back and
 * interpolate between frames. See docs/data-contract.md for the full spec.
 */

export const replayMetaSchema = z.object({
  schemaVersion: z.string(),
  year: z.number().int(),
  raceName: z.string(),
  session: sessionCodeSchema,
  /** Frames-per-second the timeline was sampled at (used for playback math). */
  frameRate: z.number().positive().default(10),
  generatedAt: isoDateSchema,
  dataSources: z.array(z.string()).min(1),
  disclaimer: z.string(),
});

export const trackSchema = z.object({
  name: z.string(),
  /** Ordered outline polyline in world-coordinates. */
  points: z.array(pointSchema).min(2),
  bounds: boundsSchema,
  /** Optional rotation (radians) applied before scaling for nicer framing. */
  rotation: z.number().nullable().optional(),
});

export const replayDriverSchema = z.object({
  driverNumber: z.string(),
  code: z.string(),
  name: z.string(),
  team: z.string(),
  color: hexColorSchema,
});

/**
 * A single car's state within one frame. Nullable fields (`gapToLeader`,
 * `interval`, `compound`) degrade gracefully when the source lacks them — they
 * are never fabricated.
 */
export const carFrameSchema = z.object({
  driverNumber: z.string(),
  x: z.number(),
  y: z.number(),
  position: z.number().int().positive(),
  gapToLeader: z.number().nullable(),
  interval: z.number().nullable(),
  status: carStatusSchema,
  compound: tyreCompoundSchema.nullable(),
});

export const frameSchema = z.object({
  /** Seconds from the start of the replay timeline. */
  t: z.number(),
  lap: z.number().int().nonnegative(),
  /** Human-readable elapsed race time, e.g. "01:23:45". */
  raceTime: z.string(),
  cars: z.array(carFrameSchema),
});

export const replaySchema = z.object({
  meta: replayMetaSchema,
  track: trackSchema,
  drivers: z.array(replayDriverSchema).min(1),
  frames: z.array(frameSchema).min(1),
});

export type ReplayMeta = z.infer<typeof replayMetaSchema>;
export type Track = z.infer<typeof trackSchema>;
export type ReplayDriver = z.infer<typeof replayDriverSchema>;
export type CarFrame = z.infer<typeof carFrameSchema>;
export type Frame = z.infer<typeof frameSchema>;
export type Replay = z.infer<typeof replaySchema>;
