/**
 * @f1pitwall/replay-widget — a reusable React/Canvas F1 race-replay engine.
 *
 * Two ways to consume it:
 *  - <RaceReplayWidget replayUrl="…" /> for a batteries-included embed.
 *  - The individual hooks/components (useReplayEngine, TrackCanvas, Leaderboard,
 *    Controls) to compose a richer dashboard, as apps/web does.
 */

// High-level widget
export { RaceReplayWidget } from './components/RaceReplayWidget';
export type { RaceReplayWidgetProps } from './components/RaceReplayWidget';

// Composable pieces
export { TrackCanvas } from './components/TrackCanvas';
export type { TrackCanvasProps } from './components/TrackCanvas';
export { Leaderboard } from './components/Leaderboard';
export type { LeaderboardProps } from './components/Leaderboard';
export { Controls } from './components/Controls';
export type { ControlsProps } from './components/Controls';
export { ReplayHud } from './components/ReplayHud';
export type { ReplayHudProps } from './components/ReplayHud';
export { NextRaceCard } from './components/NextRaceCard';
export type { NextRaceCardProps } from './components/NextRaceCard';

// Engine + data hooks
export {
  useReplayEngine,
  useEngineTime,
  type ReplayEngine,
  type ReplayEngineOptions,
} from './engine/useReplayEngine';
export { useReplayData, type AsyncState } from './engine/useReplayData';

// Pure core (also useful for tests and non-React consumers)
export { createTransform, type Transform } from './core/geometry';
export {
  sampleReplay,
  replayDuration,
  findFloorIndex,
  type SampledCar,
  type SampledFrame,
} from './core/interpolation';
export { formatClock, formatGap, formatRaceDate } from './core/format';
