import { z } from 'zod';
import { isoDateSchema, sessionCodeSchema } from './common';

/** One race entry in the season index. */
export const seasonRaceSchema = z.object({
  round: z.number().int().positive(),
  raceName: z.string(),
  /** URL-safe identifier used for `races/<slug>.json`. */
  slug: z.string(),
  session: sessionCodeSchema,
  /** True when a generated replay exists for this race. */
  hasReplay: z.boolean(),
  /** Race date (ISO). May be a future date for not-yet-run rounds. */
  date: isoDateSchema.nullable(),
});

export const seasonIndexSchema = z.object({
  year: z.number().int(),
  generatedAt: isoDateSchema,
  races: z.array(seasonRaceSchema),
});

export type SeasonRace = z.infer<typeof seasonRaceSchema>;
export type SeasonIndex = z.infer<typeof seasonIndexSchema>;
