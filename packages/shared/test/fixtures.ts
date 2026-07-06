import { DISCLAIMER, SCHEMA_VERSION } from '../src/constants.js';
import type { Replay } from '../src/index.js';

/** A minimal but fully valid replay used across schema tests. */
export function makeValidReplay(): Replay {
  return {
    meta: {
      schemaVersion: SCHEMA_VERSION,
      year: 2026,
      raceName: 'Sample Grand Prix',
      session: 'R',
      frameRate: 10,
      generatedAt: '2026-07-06T12:00:00.000Z',
      dataSources: ['synthetic'],
      disclaimer: DISCLAIMER,
    },
    track: {
      name: 'Sample Circuit',
      points: [
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
        [0, 0],
      ],
      bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
    },
    drivers: [
      { driverNumber: '4', code: 'NOR', name: 'Lando Norris', team: 'McLaren', color: '#FF8000' },
    ],
    frames: [
      {
        t: 0,
        lap: 1,
        raceTime: '00:00:00',
        cars: [
          {
            driverNumber: '4',
            x: 0,
            y: 0,
            position: 1,
            gapToLeader: null,
            interval: null,
            status: 'RUNNING',
            compound: 'MEDIUM',
          },
        ],
      },
    ],
  };
}
