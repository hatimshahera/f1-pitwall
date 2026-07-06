# @f1pitwall/replay-widget

A reusable React/Canvas **F1 race-replay** widget. Point it at a replay JSON URL
and it fetches, validates, and animates a race — track ribbon, moving driver
markers, live leaderboard with gaps, lap/time, and next-race card.

Part of [f1-pitwall](https://github.com/hatimshahera/f1-pitwall). Data is served
from the project's deployment (regenerated after each race), so the widget stays
current with no changes on your side.

## Install

```bash
npm install @f1pitwall/replay-widget react react-dom
```

## Use

```tsx
import { RaceReplayWidget } from '@f1pitwall/replay-widget';
import '@f1pitwall/replay-widget/styles.css';

export function LatestRace() {
  return (
    <RaceReplayWidget
      replayUrl="https://f1-pitwall-web.vercel.app/data/latest-replay.json"
      nextRaceUrl="https://f1-pitwall-web.vercel.app/data/next-race.json"
      compact
      autoplay
      speed={4} // playback multiplier
      showControls={false}
      leaderboardLimit={3} // top-3 strip near the track
      showNextRace
    />
  );
}
```

### Props

| Prop               | Type      | Default | Description                            |
| ------------------ | --------- | ------- | -------------------------------------- |
| `replayUrl`        | `string`  | —       | Replay JSON URL (required).            |
| `compact`          | `boolean` | `false` | Compact layout for embeds.             |
| `autoplay`         | `boolean` | `false` | Start playing (loops in compact mode). |
| `speed`            | `number`  | `1`     | Initial playback speed multiplier.     |
| `showControls`     | `boolean` | `true`  | Play/seek/speed controls.              |
| `showLeaderboard`  | `boolean` | `true`  | Live leaderboard.                      |
| `leaderboardLimit` | `number`  | —       | Max leaderboard rows (e.g. `3`).       |
| `showNextRace`     | `boolean` | `false` | Next-race card (needs `nextRaceUrl`).  |
| `nextRaceUrl`      | `string`  | —       | Next-race JSON URL.                    |
| `showDisclaimer`   | `boolean` | `true`  | Show the unofficial-data disclaimer.   |

It's theme-aware (light/dark) and restyleable via the `--f1pw-*` CSS variables.
The composable pieces (`useReplayEngine`, `TrackCanvas`, `Leaderboard`,
`Controls`) are also exported if you want to build a custom layout.

## License

MIT. Unofficial project — not affiliated with Formula 1.
