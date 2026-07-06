import { useEffect, useState } from 'react';
import { validateNextRace, type NextRace } from '@f1pitwall/shared';
import { formatRaceDate } from '../core/format';

export interface NextRaceCardProps {
  /** URL to a next-race JSON document. */
  url: string;
  className?: string;
}

/** Small "next race" card that fetches and validates next-race.json. */
export function NextRaceCard({ url, className }: NextRaceCardProps): React.JSX.Element | null {
  const [race, setRace] = useState<NextRace | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((json: unknown) => {
        const result = validateNextRace(json);
        if (result.ok) setRace(result.data);
      })
      .catch(() => {
        /* silent: the card simply doesn't render if data is unavailable */
      });
    return () => controller.abort();
  }, [url]);

  if (!race) return null;

  return (
    <div className={className} data-f1pw="next-race">
      <span data-col="label">Next race</span>
      <span data-col="name">{race.raceName}</span>
      <span data-col="date">{formatRaceDate(race.date)}</span>
    </div>
  );
}
