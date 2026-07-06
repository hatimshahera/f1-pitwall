import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  validateNextRace,
  validateReplay,
  validateSeasonIndex,
  type NextRace,
  type Replay,
  type SeasonIndex,
} from '@f1pitwall/shared';

/**
 * Server-side readers for the generated JSON. The source of truth is the repo's
 * /public-data, copied into this app's public/data before dev/build (see
 * scripts/copy-data.mjs). Everything here reads that copied directory so it also
 * works inside Vercel's serverless functions.
 */

const DATA_DIR = join(process.cwd(), 'public', 'data');

async function readJson(relativePath: string): Promise<unknown | null> {
  try {
    const raw = await readFile(join(DATA_DIR, relativePath), 'utf8');
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export async function getLatestReplay(): Promise<Replay | null> {
  const json = await readJson('latest-replay.json');
  if (json === null) return null;
  const result = validateReplay(json);
  return result.ok ? result.data : null;
}

export async function getRaceReplay(slug: string): Promise<Replay | null> {
  // Guard against path traversal via the slug.
  if (!/^[a-z0-9-]+$/i.test(slug)) return null;
  const json = await readJson(join('races', `${slug}.json`));
  if (json === null) return null;
  const result = validateReplay(json);
  return result.ok ? result.data : null;
}

export async function getSeasonIndex(): Promise<SeasonIndex | null> {
  const json = await readJson('season-index.json');
  if (json === null) return null;
  const result = validateSeasonIndex(json);
  return result.ok ? result.data : null;
}

export async function getNextRace(): Promise<NextRace | null> {
  const json = await readJson('next-race.json');
  if (json === null) return null;
  const result = validateNextRace(json);
  return result.ok ? result.data : null;
}
