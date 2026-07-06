import { describe, expect, it } from 'vitest';
import type { Replay } from '@f1pitwall/shared';
import { findFloorIndex, replayDuration, sampleReplay } from '../src/core/interpolation';

function twoFrameReplay(): Replay {
  return {
    meta: {
      schemaVersion: '2.0',
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
      width: 2,
    },
    drivers: [{ driverNumber: '1', code: 'AAA', name: 'A', team: 'T', color: '#ff0000' }],
    timeline: { t: [0, 10], lap: [1, 2] },
    cars: [
      {
        driverNumber: '1',
        x: [0, 100],
        y: [0, 200],
        position: [1, 1],
        gapToLeader: [0, 5.5],
        interval: null,
        statusSegments: [[0, 'RUNNING']],
        compoundSegments: [
          [0, 'MEDIUM'],
          [1, 'HARD'],
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
  const times = twoFrameReplay().timeline.t;
  it('clamps below the first frame', () => {
    expect(findFloorIndex(times, -5)).toBe(0);
  });
  it('clamps above the last frame', () => {
    expect(findFloorIndex(times, 999)).toBe(1);
  });
  it('returns the floor for a mid time', () => {
    expect(findFloorIndex(times, 4.9)).toBe(0);
    expect(findFloorIndex(times, 10)).toBe(1);
  });
});

describe('sampleReplay', () => {
  it('linearly interpolates car position at the midpoint', () => {
    const frame = sampleReplay(twoFrameReplay(), 5);
    expect(frame.cars[0]!.x).toBeCloseTo(50, 5);
    expect(frame.cars[0]!.y).toBeCloseTo(100, 5);
  });

  it('takes discrete fields (lap, raceTime, compound, gap) from the floor frame', () => {
    const frame = sampleReplay(twoFrameReplay(), 5);
    expect(frame.lap).toBe(1);
    expect(frame.raceTime).toBe('00:00');
    expect(frame.cars[0]!.compound).toBe('MEDIUM');
    expect(frame.cars[0]!.gapToLeader).toBe(0); // floor frame value, not interpolated
  });

  it('returns null interval when the array is absent (derived on the client)', () => {
    const frame = sampleReplay(twoFrameReplay(), 5);
    expect(frame.cars[0]!.interval).toBeNull();
  });

  it('resolves change-segments (compound switches at frame 1)', () => {
    const frame = sampleReplay(twoFrameReplay(), 10);
    expect(frame.cars[0]!.compound).toBe('HARD');
  });

  it('returns exact endpoints without overshoot', () => {
    const start = sampleReplay(twoFrameReplay(), 0);
    expect(start.cars[0]!.x).toBe(0);
    const end = sampleReplay(twoFrameReplay(), 10);
    expect(end.cars[0]!.x).toBe(100);
  });
});
