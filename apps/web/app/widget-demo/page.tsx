'use client';

import { RaceReplayWidget } from '@f1pitwall/replay-widget';

/**
 * Demonstrates the embeddable widget exactly as a personal site would use it:
 * compact, autoplay, no controls. Fetches the same public JSON URL.
 */
export default function WidgetDemoPage(): React.JSX.Element {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-lg font-semibold">Embeddable widget preview</h1>
      <p className="mb-6 text-sm text-[color:var(--muted)]">
        This is the <code>&lt;RaceReplayWidget&gt;</code> in compact, autoplay mode — the version
        intended for a portfolio homepage.
      </p>

      <RaceReplayWidget
        replayUrl="/data/latest-replay.json"
        nextRaceUrl="/data/next-race.json"
        compact
        autoplay
        showControls={false}
        showLeaderboard
        showNextRace
      />

      <pre className="mt-6 overflow-x-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4 text-xs">
        {`<RaceReplayWidget
  replayUrl="https://f1-pitwall.vercel.app/data/latest-replay.json"
  compact
  autoplay
  showControls={false}
  showNextRace
/>`}
      </pre>
    </main>
  );
}
