import { getNextRace } from '@/lib/data';
import { corsPreflight, jsonWithCors, notFound } from '@/lib/apiResponse';

export const dynamic = 'force-static';

export async function GET(): Promise<Response> {
  const nextRace = await getNextRace();
  if (!nextRace) return notFound('No next-race data has been generated yet.');
  return jsonWithCors(nextRace);
}

export function OPTIONS(): Response {
  return corsPreflight();
}
