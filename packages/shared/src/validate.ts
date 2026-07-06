import type { z } from 'zod';
import { replaySchema, type Replay } from './schemas/replay';
import { seasonIndexSchema, type SeasonIndex } from './schemas/season';
import { nextRaceSchema, type NextRace } from './schemas/nextRace';
import { predictionsSchema, type Predictions } from './schemas/predictions';

/** Result of a safe parse: either typed data or a flat list of error messages. */
export type ValidationResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

function toResult<T>(parsed: z.SafeParseReturnType<unknown, T>): ValidationResult<T> {
  if (parsed.success) return { ok: true, data: parsed.data };
  const errors = parsed.error.issues.map(
    (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
  );
  return { ok: false, errors };
}

/**
 * Validate an unknown value against the replay contract. Returns a discriminated
 * result rather than throwing, so UI code can branch to an error state cleanly.
 */
export function validateReplay(input: unknown): ValidationResult<Replay> {
  return toResult(replaySchema.safeParse(input));
}

export function validateSeasonIndex(input: unknown): ValidationResult<SeasonIndex> {
  return toResult(seasonIndexSchema.safeParse(input));
}

export function validateNextRace(input: unknown): ValidationResult<NextRace> {
  return toResult(nextRaceSchema.safeParse(input));
}

export function validatePredictions(input: unknown): ValidationResult<Predictions> {
  return toResult(predictionsSchema.safeParse(input));
}
