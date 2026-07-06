import { z } from 'zod';
import { CAR_STATUSES, SESSION_CODES, TYRE_COMPOUNDS } from '../constants';

/** ISO-8601 timestamp string (validated loosely — must parse as a Date). */
export const isoDateSchema = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'Invalid ISO date string' });

/** A hex colour like `#RRGGBB` or `#RGB`. */
export const hexColorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Expected a hex colour like #FF8000');

export const sessionCodeSchema = z.enum(SESSION_CODES);
export const carStatusSchema = z.enum(CAR_STATUSES);
export const tyreCompoundSchema = z.enum(TYRE_COMPOUNDS);

/** A 2D point in track world-coordinates: `[x, y]`. */
export const pointSchema = z.tuple([z.number(), z.number()]);

/** Axis-aligned bounding box of the track outline, in world-coordinates. */
export const boundsSchema = z.object({
  minX: z.number(),
  maxX: z.number(),
  minY: z.number(),
  maxY: z.number(),
});

export type Point = z.infer<typeof pointSchema>;
export type Bounds = z.infer<typeof boundsSchema>;
export type SessionCode = z.infer<typeof sessionCodeSchema>;
export type CarStatus = z.infer<typeof carStatusSchema>;
export type TyreCompound = z.infer<typeof tyreCompoundSchema>;
