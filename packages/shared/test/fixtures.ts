import { DISCLAIMER, SCHEMA_VERSION } from '../src/constants';
import type { Replay } from '../src/index';

/** A minimal but fully valid v2 (structure-of-arrays) replay for schema tests. */
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
      rotation: 0,
      width: 10,
    },
    drivers: [
      { driverNumber: '4', code: 'NOR', name: 'Lando Norris', team: 'McLaren', color: '#FF8000' },
    ],
    timeline: {
      t: [0, 1, 2],
      lap: [1, 1, 2],
    },
    cars: [
      {
        driverNumber: '4',
        x: [0, 50, 100],
        y: [0, 0, 0],
        position: [1, 1, 1],
        gapToLeader: [null, null, null],
        interval: [null, null, null],
        statusSegments: [[0, 'RUNNING']],
        compoundSegments: [[0, 'MEDIUM']],
      },
    ],
  };
}
