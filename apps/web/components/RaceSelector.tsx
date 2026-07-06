'use client';

import type { SeasonIndex } from '@f1pitwall/shared';

interface RaceSelectorProps {
  season: SeasonIndex;
  /** Currently selected slug, or 'latest'. */
  value: string;
  onChange: (slug: string) => void;
}

/** Dropdown to pick a race from the current season (races with replays only). */
export function RaceSelector({ season, value, onChange }: RaceSelectorProps): React.JSX.Element {
  const replayable = season.races.filter((r) => r.hasReplay);

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-[color:var(--muted)]">Race</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] px-3 py-1.5 text-sm"
      >
        <option value="latest">Latest completed</option>
        {replayable.map((race) => (
          <option key={race.slug} value={race.slug}>
            R{race.round} · {race.raceName}
          </option>
        ))}
      </select>
    </label>
  );
}
