import { useEngineTime, type ReplayEngine } from '../engine/useReplayEngine';
import { formatClock } from '../core/format';

export interface ControlsProps {
  engine: ReplayEngine;
  speeds?: number[];
  /** Rewind/skip step in seconds. */
  skipSeconds?: number;
  className?: string;
}

const DEFAULT_SPEEDS = [0.5, 1, 2, 4, 8];

/** Playback controls: restart, rewind, play/pause, speed, and a seek bar. */
export function Controls({
  engine,
  speeds = DEFAULT_SPEEDS,
  skipSeconds = 10,
  className,
}: ControlsProps): React.JSX.Element {
  const time = useEngineTime(engine, 15);
  const duration = engine.durationSec;

  return (
    <div className={className} data-f1pw="controls">
      <div data-row="buttons">
        <button type="button" onClick={() => engine.restart()} aria-label="Restart" title="Restart">
          ⏮
        </button>
        <button
          type="button"
          onClick={() => engine.skip(-skipSeconds)}
          aria-label={`Rewind ${skipSeconds} seconds`}
          title={`Rewind ${skipSeconds}s`}
        >
          ⏪
        </button>
        <button
          type="button"
          onClick={() => engine.toggle()}
          aria-label={engine.isPlaying ? 'Pause' : 'Play'}
          data-primary
        >
          {engine.isPlaying ? '⏸' : '▶'}
        </button>
        <button
          type="button"
          onClick={() => engine.skip(skipSeconds)}
          aria-label={`Forward ${skipSeconds} seconds`}
          title={`Forward ${skipSeconds}s`}
        >
          ⏩
        </button>
        <label data-row="speed">
          <span className="sr-only">Playback speed</span>
          <select
            value={engine.speed}
            onChange={(e) => engine.setSpeed(Number(e.target.value))}
            aria-label="Playback speed"
          >
            {speeds.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </label>
      </div>
      <div data-row="seek">
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={Math.min(time, duration)}
          onChange={(e) => engine.seek(Number(e.target.value))}
          aria-label="Seek"
        />
        <span data-col="time">
          {formatClock(time)} / {formatClock(duration)}
        </span>
      </div>
    </div>
  );
}
