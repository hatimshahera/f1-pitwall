import { z } from 'zod';
import { isoDateSchema, sessionCodeSchema } from './common';

/**
 * Experimental podium-prediction contract. Populated in Phase 3; the schema is
 * defined now so the dashboard/API can render an honest empty state and the
 * pipeline has a target to export against.
 */

export const predictedDriverSchema = z.object({
  driverNumber: z.string(),
  code: z.string(),
  name: z.string(),
  team: z.string(),
  /** Predicted finishing rank (1 = winner). */
  predictedRank: z.number().int().positive(),
  /** Probability of a top-3 finish, in [0, 1]. */
  podiumProbability: z.number().min(0).max(1),
});

export const predictionsSchema = z.object({
  meta: z.object({
    schemaVersion: z.string(),
    year: z.number().int(),
    raceName: z.string(),
    round: z.number().int().positive(),
    session: sessionCodeSchema,
    model: z.string(),
    generatedAt: isoDateSchema,
    experimental: z.literal(true),
    disclaimer: z.string(),
  }),
  drivers: z.array(predictedDriverSchema),
});

export type PredictedDriver = z.infer<typeof predictedDriverSchema>;
export type Predictions = z.infer<typeof predictionsSchema>;
