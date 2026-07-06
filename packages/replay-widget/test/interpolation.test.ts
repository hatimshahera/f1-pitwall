import { describe, expect, it } from 'vitest';
import type { Replay } from '@f1pitwall/shared';
import { findFloorIndex, replayDuration, sampleReplay } from '../src/core/interpolation.js';

function twoFrameReplay(): Replay {
  return {
    meta: {
      schemaVersion: '1.0',
      year: 2026,
      raceName: 'Test GP',
      session: 'R',
      frameRate: 10,
      generatedAt: '2026-07-06T00:00:00Z',
      dataSources: ['synthetic'],
      disclaimer: 'test',
    },
    track: {
      name: 'T',
      points: [
        [0, 0],
        [10, 10],
      ],
      bounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
    },
    drivers: [{ driverNumber: '1', code: 'AAA', name: 'A', team: 'T', color: '#ff0000' }],
    frames: [
      {
        t: 0,
        lap: 1,
        raceTime: '00:00:00',
        cars: [
          {
            driverNumber: '1',
            x: 0,
            y: 0,
            position: 1,
            gapToLeader: 0,
            interval: null,
            status: 'RUNNING',
            compound: 'MEDIUM',
          },
        ],
      },
      {
        t: 10,
        lap: 2,
        raceTime: '00:00:10',
        cars: [
          {
            driverNumber: '1',
            x: 100,
            y: 200,
            position: 1,
            gapToLeader: 0,
            interval: null,
            status: 'RUNNING',
            compound: 'MEDIUM',
          },
        ],
      },
    ],
  };
}

describe('replayDuration', () => {
  it('returns the time of the last frame', () => {
    expect(replayDuration(twoFrameReplay())).toBe(10);
  });
});

describe('findFloorIndex', () => {
  const frames = twoFrameReplay().frames;
  it('clamps below the first frame', () => {
    expect(findFloorIndex(frames, -5)).toBe(0);
  });
  it('clamps above the last frame', () => {
    expect(findFloorIndex(frames, 999)).toBe(1);
  });
  it('returns the floor for a mid time', () => {
    expect(findFloorIndex(frames, 4.9)).toBe(0);
    expect(findFloorIndex(frames, 10)).toBe(1);
  });
});

describe('sampleReplay', () => {
  it('linearly interpolates car position at the midpoint', () => {
    const frame = sampleReplay(twoFrameReplay(), 5);
    expect(frame.cars[0]!.x).toBeCloseTo(50, 5);
    expect(frame.cars[0]!.y).toBeCloseTo(100, 5);
  });

  it('takes discrete fields (lap, raceTime) from the floor frame', () => {
    const frame = sampleReplay(twoFrameReplay(), 5);
    expect(frame.lap).toBe(1);
    expect(frame.raceTime).toBe('00:00:00');
  });

  it('returns exact endpoints without overshoot', () => {
    const start = sampleReplay(twoFrameReplay(), 0);
    expect(start.cars[0]!.x).toBe(0);
    const end = sampleReplay(twoFrameReplay(), 10);
    expect(end.cars[0]!.x).toBe(100);
  });
});
