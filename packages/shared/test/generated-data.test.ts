import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateNextRace, validateReplay, validateSeasonIndex } from '../src/index';

/**
 * Cross-language contract check: the JSON emitted by the Python pipeline must
 * satisfy the same schemas the dashboard uses. If no data has been generated
 * yet, these are skipped rather than failed.
 */

const publicData = resolve(dirname(fileURLToPath(import.meta.url)), '../../../public-data');

function readJson(rel: string): unknown | null {
  const path = resolve(publicData, rel);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

describe('generated public-data validates against the shared contract', () => {
  it('latest-replay.json (if present) is a valid replay', () => {
    const json = readJson('latest-replay.json');
    if (json === null) return; // not generated yet
    const result = validateReplay(json);
    expect(result.ok, result.ok ? '' : result.errors.join('\n')).toBe(true);
  });

  it('season-index.json (if present) is valid', () => {
    const json = readJson('season-index.json');
    if (json === null) return;
    const result = validateSeasonIndex(json);
    expect(result.ok, result.ok ? '' : result.errors.join('\n')).toBe(true);
  });

  it('next-race.json (if present) is valid', () => {
    const json = readJson('next-race.json');
    if (json === null) return;
    const result = validateNextRace(json);
    expect(result.ok, result.ok ? '' : result.errors.join('\n')).toBe(true);
  });
});
