import { z } from 'zod';
import { isoDateSchema } from './common';

/** A named session within a race weekend, with its scheduled start (ISO). */
export const raceSessionSchema = z.object({
  name: z.string(),
  startsAt: isoDateSchema.nullable(),
});

/**
 * The next upcoming race. `null`-friendly so the dashboard can show a graceful
 * "season complete / schedule unavailable" state.
 */
export const nextRaceSchema = z.object({
  year: z.number().int(),
  raceName: z.string(),
  round: z.number().int().positive(),
  circuit: z.string(),
  country: z.string().nullable(),
  /** The race start (ISO), or null if unknown. */
  date: isoDateSchema.nullable(),
  sessions: z.array(raceSessionSchema).default([]),
  generatedAt: isoDateSchema,
});

export type RaceSession = z.infer<typeof raceSessionSchema>;
export type NextRace = z.infer<typeof nextRaceSchema>;
