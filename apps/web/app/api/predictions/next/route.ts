import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validatePredictions } from '@f1pitwall/shared';
import { corsPreflight, jsonWithCors, notFound } from '@/lib/apiResponse';

export const dynamic = 'force-static';

/**
 * Experimental podium predictions for the next race. Populated in Phase 3; for
 * now it returns 404 until /public-data/predictions/next.json exists.
 */
export async function GET(): Promise<Response> {
  try {
    const raw = await readFile(
      join(process.cwd(), 'public', 'data', 'predictions', 'next.json'),
      'utf8',
    );
    const result = validatePredictions(JSON.parse(raw) as unknown);
    if (!result.ok) return notFound('Predictions data is invalid or not yet available.');
    return jsonWithCors(result.data);
  } catch {
    return notFound('No predictions have been generated yet (experimental, Phase 3).');
  }
}

export function OPTIONS(): Response {
  return corsPreflight();
}
