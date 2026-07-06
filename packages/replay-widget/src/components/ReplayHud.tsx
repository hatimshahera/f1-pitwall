import { useMemo } from 'react';
import type { Replay } from '@f1pitwall/shared';
import { sampleReplay } from '../core/interpolation';
import { useEngineTime, type ReplayEngine } from '../engine/useReplayEngine';

export interface ReplayHudProps {
  replay: Replay;
  engine: ReplayEngine;
  className?: string;
}

/** Compact heads-up display: race name, current lap, and elapsed race time. */
export function ReplayHud({ replay, engine, className }: ReplayHudProps): React.JSX.Element {
  const time = useEngineTime(engine, 8);
  const { lap, raceTime } = useMemo(() => sampleReplay(replay, time), [replay, time]);
  const totalLaps = useMemo(
    () => replay.frames.reduce((max, f) => Math.max(max, f.lap), 0),
    [replay],
  );

  return (
    <div className={className} data-f1pw="hud">
      <span data-col="race">{replay.meta.raceName}</span>
      <span data-col="lap">
        LAP {lap}
        {totalLaps > 0 ? ` / ${totalLaps}` : ''}
      </span>
      <span data-col="time">{raceTime}</span>
    </div>
  );
}
