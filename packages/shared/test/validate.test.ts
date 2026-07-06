import { describe, expect, it } from 'vitest';
import {
  validateNextRace,
  validatePredictions,
  validateReplay,
  validateSeasonIndex,
} from '../src/index.js';
import { makeValidReplay } from './fixtures.js';

describe('validateReplay', () => {
  it('accepts a well-formed replay', () => {
    const result = validateReplay(makeValidReplay());
    expect(result.ok).toBe(true);
  });

  it('rejects a replay with no frames', () => {
    const replay = makeValidReplay();
    replay.frames = [];
    const result = validateReplay(replay);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/frames/);
  });

  it('rejects an invalid hex colour', () => {
    const replay = makeValidReplay();
    // @ts-expect-error intentionally invalid for the test
    replay.drivers[0].color = 'orange';
    const result = validateReplay(replay);
    expect(result.ok).toBe(false);
  });

  it('rejects an unknown car status', () => {
    const replay = makeValidReplay();
    // @ts-expect-error intentionally invalid for the test
    replay.frames[0].cars[0].status = 'FLYING';
    expect(validateReplay(replay).ok).toBe(false);
  });

  it('allows nullable gap/interval/compound (graceful degradation)', () => {
    const replay = makeValidReplay();
    replay.frames[0]!.cars[0]!.compound = null;
    replay.frames[0]!.cars[0]!.gapToLeader = null;
    expect(validateReplay(replay).ok).toBe(true);
  });
});

describe('validateSeasonIndex', () => {
  it('accepts a valid index and an empty race list', () => {
    expect(
      validateSeasonIndex({ year: 2026, generatedAt: '2026-07-06T00:00:00Z', races: [] }).ok,
    ).toBe(true);
  });

  it('rejects a missing year', () => {
    expect(validateSeasonIndex({ generatedAt: '2026-07-06T00:00:00Z', races: [] }).ok).toBe(false);
  });
});

describe('validateNextRace', () => {
  it('accepts a next race with a null date', () => {
    const result = validateNextRace({
      year: 2026,
      raceName: 'British Grand Prix',
      round: 12,
      circuit: 'Silverstone',
      country: 'United Kingdom',
      date: null,
      sessions: [],
      generatedAt: '2026-07-06T00:00:00Z',
    });
    expect(result.ok).toBe(true);
  });
});

describe('validatePredictions', () => {
  it('requires the experimental flag to be true', () => {
    const result = validatePredictions({
      meta: {
        schemaVersion: '1.0',
        year: 2026,
        raceName: 'British Grand Prix',
        round: 12,
        session: 'R',
        model: 'baseline',
        generatedAt: '2026-07-06T00:00:00Z',
        experimental: false,
        disclaimer: 'x',
      },
      drivers: [],
    });
    expect(result.ok).toBe(false);
  });
});
