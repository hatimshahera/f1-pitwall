import { getSeasonIndex } from '@/lib/data';
import { corsPreflight, jsonWithCors, notFound } from '@/lib/apiResponse';

export const dynamic = 'force-static';

export async function GET(): Promise<Response> {
  const season = await getSeasonIndex();
  if (!season) return notFound('No season index has been generated yet.');
  return jsonWithCors(season);
}

export function OPTIONS(): Response {
  return corsPreflight();
}
