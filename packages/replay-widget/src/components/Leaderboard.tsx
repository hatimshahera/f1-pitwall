import { useMemo } from 'react';
import type { Replay } from '@f1pitwall/shared';
import { sampleReplay } from '../core/interpolation';
import { formatGap } from '../core/format';
import { useEngineTime, type ReplayEngine } from '../engine/useReplayEngine';

export interface LeaderboardProps {
  replay: Replay;
  engine: ReplayEngine;
  /** Show only the top N rows (e.g. compact widget). */
  limit?: number;
  /** Show the gap-to-leader column. */
  showGap?: boolean;
  className?: string;
}

const TYRE_SHORT: Record<string, string> = {
  SOFT: 'S',
  MEDIUM: 'M',
  HARD: 'H',
  INTERMEDIATE: 'I',
  WET: 'W',
  UNKNOWN: '?',
};

/** Live leaderboard ordered by the current frame's `position`. */
export function Leaderboard({
  replay,
  engine,
  limit,
  showGap = true,
  className,
}: LeaderboardProps): React.JSX.Element {
  const time = useEngineTime(engine, 6);
  const driverMeta = useMemo(
    () => new Map(replay.drivers.map((d) => [d.driverNumber, d])),
    [replay],
  );

  const rows = useMemo(() => {
    const frame = sampleReplay(replay, time);
    const sorted = [...frame.cars].sort((a, b) => a.position - b.position);
    return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
  }, [replay, time, limit]);

  return (
    <ol className={className} data-f1pw="leaderboard">
      {rows.map((car) => {
        const meta = driverMeta.get(car.driverNumber);
        return (
          <li key={car.driverNumber} data-status={car.status}>
            <span data-col="pos">{car.position}</span>
            <span data-col="color" style={{ background: meta?.color ?? '#9aa0a6' }} aria-hidden />
            <span data-col="code">{meta?.code ?? car.driverNumber}</span>
            {car.compound && (
              <span data-col="tyre" title={car.compound}>
                {TYRE_SHORT[car.compound] ?? '?'}
              </span>
            )}
            {showGap && <span data-col="gap">{formatGap(car.gapToLeader)}</span>}
          </li>
        );
      })}
    </ol>
  );
}
