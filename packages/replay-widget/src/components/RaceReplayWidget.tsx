import { DISCLAIMER } from '@f1pitwall/shared';
import { useReplayData } from '../engine/useReplayData';
import { useReplayEngine } from '../engine/useReplayEngine';
import { TrackCanvas } from './TrackCanvas';
import { Leaderboard } from './Leaderboard';
import { Controls } from './Controls';
import { ReplayHud } from './ReplayHud';
import { NextRaceCard } from './NextRaceCard';

export interface RaceReplayWidgetProps {
  /** URL of the replay JSON (static file or API route). */
  replayUrl: string;
  /** Compact layout for embedding on a portfolio site. */
  compact?: boolean;
  /** Start playing automatically (loops in compact mode). */
  autoplay?: boolean;
  /** Show playback controls. */
  showControls?: boolean;
  /** Show the live leaderboard. */
  showLeaderboard?: boolean;
  /** Show the next-race card (requires `nextRaceUrl`). */
  showNextRace?: boolean;
  /** URL of a next-race JSON document, used when `showNextRace` is set. */
  nextRaceUrl?: string;
  /** Show the disclaimer line. Defaults to true. */
  showDisclaimer?: boolean;
  className?: string;
}

/**
 * The reusable, self-contained race-replay widget. Fetches + validates a replay
 * document, then animates it on a canvas. Designed to drop into any React app
 * (including a personal Next.js site) via a single public JSON URL.
 */
export function RaceReplayWidget({
  replayUrl,
  compact = false,
  autoplay = false,
  showControls = true,
  showLeaderboard = true,
  showNextRace = false,
  nextRaceUrl,
  showDisclaimer = true,
  className,
}: RaceReplayWidgetProps): React.JSX.Element {
  const state = useReplayData(replayUrl);
  const engine = useReplayEngine(state.data, {
    autoplay,
    loop: compact && autoplay,
    initialSpeed: 1,
  });

  const rootClass = ['f1pw-widget', compact ? 'f1pw-widget--compact' : '', className]
    .filter(Boolean)
    .join(' ');

  if (state.status === 'loading') {
    return (
      <div className={rootClass} data-f1pw="widget">
        <div data-f1pw="status">Loading replay…</div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className={rootClass} data-f1pw="widget">
        <div data-f1pw="status" data-variant="error">
          Couldn&apos;t load the replay. {state.error}
        </div>
      </div>
    );
  }

  if (state.status === 'empty' || !state.data) {
    return (
      <div className={rootClass} data-f1pw="widget">
        <div data-f1pw="status">No replay available yet.</div>
      </div>
    );
  }

  const replay = state.data;

  return (
    <div className={rootClass} data-f1pw="widget">
      <div data-f1pw="stage">
        <ReplayHud replay={replay} engine={engine} className="f1pw-hud" />
        <div data-f1pw="canvas-wrap">
          <TrackCanvas replay={replay} engine={engine} showLabels={!compact} />
        </div>
        {showLeaderboard && (
          <Leaderboard
            replay={replay}
            engine={engine}
            className="f1pw-leaderboard"
            limit={compact ? 5 : undefined}
            showGap={!compact}
          />
        )}
      </div>

      {showControls && <Controls engine={engine} className="f1pw-controls" />}

      {showNextRace && nextRaceUrl && <NextRaceCard url={nextRaceUrl} className="f1pw-next-race" />}

      {showDisclaimer && (
        <p data-f1pw="disclaimer" className="f1pw-disclaimer">
          {DISCLAIMER}
        </p>
      )}
    </div>
  );
}
