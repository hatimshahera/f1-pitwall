# Architecture

`f1-pitwall` is a small monorepo split by responsibility: **Python processes
data**, **TypeScript renders it**, and a **committed JSON layer** is the contract
between them.

```
FastF1 ──► python/f1pitwall ──► public-data/*.json ──► apps/web (Vercel) ──► browser
                (generate)         (source of truth)      (dashboard + API)      │
                                          │                                      ▼
                                          └──────────────► personal website (imports the widget)
```

## Why this shape

**Static JSON first, no always-on backend.** The heavy, occasional work (loading
FastF1 sessions, resampling telemetry) happens offline in Python and is committed
as JSON. The web app only reads files. This keeps hosting on Vercel's free tier —
no Python runtime, no database, no cron server required — and makes the data
trivially cacheable and CORS-shareable with other sites.

**One contract, enforced twice.** `packages/shared` holds Zod schemas + types;
`python/f1pitwall/models.py` mirrors them with pydantic. Both validate before
data crosses the boundary, and a cross-language test checks the committed files.

**Rendering engine lives in a package, not the app.** `packages/replay-widget`
owns the canvas engine, interpolation, and UI pieces. The dashboard
(`apps/web`) and the future personal-site embed both compose the _same_ engine,
so there's one implementation of "how a replay animates".

## Packages

| Path                     | Responsibility                                                                                                                               |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared`        | Zod schemas + TS types for every JSON contract; validators.                                                                                  |
| `packages/replay-widget` | Canvas engine (`useReplayEngine`), interpolation, `TrackCanvas`, `Leaderboard`, `Controls`, and the batteries-included `<RaceReplayWidget>`. |
| `apps/web`               | Next.js dashboard, CORS API routes, static-data serving.                                                                                     |
| `python/f1pitwall`       | FastF1 adapters, replay frame generation, exporters, CLI, prediction scaffold.                                                               |

## The replay engine

The core idea (adapted from — not copied out of — the reference desktop replay):

1. **Resample to a common clock.** Every car's position is linearly resampled
   onto one uniform time grid (`python/f1pitwall/replay/frames.py`). All cars
   share identical timestamps, so a frame is just "everyone at time `t`".
2. **Ship plain frames.** The output is a list of `{ t, lap, cars[] }` — no
   engine state, no code, just data.
3. **Interpolate in the browser.** `useReplayEngine` runs a single
   `requestAnimationFrame` loop, advancing a float time in a ref (not React
   state, so 60 fps never triggers reconciliation). `TrackCanvas` and the clock
   _subscribe_ and redraw imperatively; between frames, car x/y is **lerped**
   (`sampleReplay`) for smoothness the source data doesn't have.

```
useReplayData(url) ──► validate ──► Replay
                                      │
useReplayEngine(replay) ── rAF loop ──┼──► subscribe(time) ──► TrackCanvas (imperative draw)
   play/pause/seek/speed              └──► useEngineTime  ───► Leaderboard / HUD (throttled state)
```

Decoupling the authoritative time (ref + subscription) from React state is what
keeps the animation smooth while the leaderboard/clock still re-render at a sane
rate.

## Data flow on Vercel

- `public-data/` (repo root) is the committed source of truth.
- `apps/web/scripts/copy-data.mjs` copies it into `apps/web/public/data/` before
  `dev`/`build`, so Next serves it statically at `/data/*`.
- `next.config.mjs` attaches permissive CORS to `/data/*` and traces
  `public/data/**` into the serverless functions that back `/api/*`.

## Prediction pipeline (Phase 3)

`python/f1pitwall/predictions/` is laid out as a real ML pipeline —
`load → feature_engineering → train → evaluate → predict → export` — with a
documented stub today. Evaluation is designed to use **rank-aware metrics**
(top-3 hit rate, rank correlation) with **race-wise** cross-validation, avoiding
the random-row split that leaks same-race laps between train and test.

## Extension hooks (deliberately not built yet)

- **Live-ish mode.** Frames are already time-indexed; a live source would append
  frames and the engine would follow the tail. No live code exists in Phase 1.
- **Structure-of-arrays replay encoding** (`schemaVersion` 2.0) to ship real
  full-race replays efficiently — see [data-contract.md](./data-contract.md).
