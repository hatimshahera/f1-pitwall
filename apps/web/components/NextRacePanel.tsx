'use client';

import { formatRaceDate } from '@hatimshahera/f1-pitwall-replay-widget';
import type { NextRace } from '@f1pitwall/shared';

/** Richer "next race" panel for the dashboard (the widget has a compact one). */
export function NextRacePanel({ race }: { race: NextRace | null }): React.JSX.Element {
  if (!race) {
    return (
      <section className="panel p-4">
        <h2 className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Next race</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Schedule unavailable or the season is complete.
        </p>
      </section>
    );
  }

  return (
    <section className="panel p-4">
      <h2 className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Next race</h2>
      <p className="mt-1 text-lg font-semibold">{race.raceName}</p>
      <p className="text-sm text-[color:var(--muted)]">
        {race.circuit}
        {race.country ? ` · ${race.country}` : ''}
      </p>
      <p className="mt-2 text-sm">
        Round {race.round} · {formatRaceDate(race.date)}
      </p>
    </section>
  );
}
