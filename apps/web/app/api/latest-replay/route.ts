import { getLatestReplay } from '@/lib/data';
import { corsPreflight, jsonWithCors, notFound } from '@/lib/apiResponse';

export const dynamic = 'force-static';

export async function GET(): Promise<Response> {
  const replay = await getLatestReplay();
  if (!replay) return notFound('No latest replay has been generated yet.');
  return jsonWithCors(replay);
}

export function OPTIONS(): Response {
  return corsPreflight();
}
