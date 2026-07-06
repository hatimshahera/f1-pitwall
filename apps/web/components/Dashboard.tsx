'use client';

import { useMemo, useState } from 'react';
import type { NextRace, SeasonIndex } from '@f1pitwall/shared';
import {
  Controls,
  Leaderboard,
  ReplayHud,
  TrackCanvas,
  useReplayData,
  useReplayEngine,
} from '@hatimshahera/f1-pitwall-replay-widget';
import { RaceSelector } from './RaceSelector';
import { NextRacePanel } from './NextRacePanel';

interface DashboardProps {
  season: SeasonIndex | null;
  nextRace: NextRace | null;
  /** True when latest-replay.json exists. */
  hasLatest: boolean;
}

function replayUrlFor(slug: string): string {
  return slug === 'latest' ? '/data/latest-replay.json' : `/data/races/${slug}.json`;
}

/** The interactive dashboard: race picker, replay stage, and side panels. */
export function Dashboard({ season, nextRace, hasLatest }: DashboardProps): React.JSX.Element {
  const [selected, setSelected] = useState('latest');
  const replayUrl = useMemo(
    () => (hasLatest ? replayUrlFor(selected) : null),
    [selected, hasLatest],
  );

  const state = useReplayData(replayUrl);
  const engine = useReplayEngine(state.data, { autoplay: false, initialSpeed: 1 });

  return (
    <div className="grid grid-cols-1 gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* Replay stage */}
      <section className="panel flex flex-col gap-3 p-4 lg:min-h-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">Race replay</h1>
          {season && season.races.some((r) => r.hasReplay) && (
            <RaceSelector season={season} value={selected} onChange={setSelected} />
          )}
        </div>

        {state.status === 'loading' && <StageMessage>Loading replay…</StageMessage>}
        {state.status === 'error' && (
          <StageMessage variant="error">Couldn&apos;t load the replay. {state.error}</StageMessage>
        )}
        {(state.status === 'empty' || !state.data) && state.status !== 'loading' && (
          <StageMessage>
            No replay data yet. Generate one with the Python pipeline (see the README).
          </StageMessage>
        )}

        {state.status === 'ready' && state.data && (
          <>
            <ReplayHud replay={state.data} engine={engine} className="f1pw-hud" />
            <div className="aspect-[16/10] w-full overflow-hidden rounded-xl bg-[color:var(--bg)] lg:aspect-auto lg:min-h-0 lg:flex-1">
              <TrackCanvas replay={state.data} engine={engine} showLabels />
            </div>
            <Controls engine={engine} className="f1pw-controls" />
          </>
        )}
      </section>

      {/* Side panels */}
      <aside className="flex flex-col gap-4 lg:min-h-0">
        {state.status === 'ready' && state.data && (
          <section className="panel flex flex-col p-4 lg:min-h-0 lg:flex-1">
            <h2 className="mb-2 text-xs uppercase tracking-wide text-[color:var(--muted)]">
              Leaderboard
            </h2>
            <div className="lg:min-h-0 lg:flex-1 lg:overflow-auto">
              <Leaderboard
                replay={state.data}
                engine={engine}
                className="f1pw-leaderboard"
                showGap
              />
            </div>
          </section>
        )}
        <NextRacePanel race={nextRace} />
      </aside>
    </div>
  );
}

function StageMessage({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant?: 'error';
}): React.JSX.Element {
  return (
    <div
      className="flex min-h-0 flex-1 items-center justify-center rounded-xl bg-[color:var(--bg)] p-6 text-center text-sm"
      style={{ color: variant === 'error' ? 'var(--accent)' : 'var(--muted)' }}
    >
      {children}
    </div>
  );
}
