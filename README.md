# 🏁 f1-pitwall

**An unofficial F1 race-replay dashboard and prediction sandbox, built from
public data.** A Python pipeline turns completed F1 sessions into a compact,
web-friendly JSON contract; a Next.js dashboard (and a reusable React/Canvas
widget) animate it — deployable free on Vercel with no always-on backend.

> **Status:** Phase 1 — post-race replay + real 2026 schedule + experimental
> prediction scaffold. See the [roadmap](#roadmap).

<!-- TODO: add screenshots/GIF of the dashboard and the compact widget here -->
<!-- ![Dashboard](docs/screenshots/dashboard.png) -->
<!-- ![Widget](docs/screenshots/widget.png) -->

---

## What it demonstrates

- **End-to-end data engineering** — unofficial data (FastF1) → resampled replay
  frames → a versioned JSON contract, validated on both sides (pydantic + Zod).
- **A real-time rendering engine** — a canvas replay with frame interpolation, a
  ref-based rAF loop decoupled from React state, and clean play/seek/speed
  controls.
- **Monorepo & reuse** — the same engine powers the full dashboard and a small
  embeddable `<RaceReplayWidget>` for a separate personal site.
- **Free, backend-less hosting** — static JSON + CORS + thin API routes on
  Vercel's free tier.
- **Honest engineering judgement** — documented trade-offs (see
  [docs/lesson.md](docs/lesson.md)), graceful degradation, and an experimental ML
  layer kept clearly labelled.

## Architecture at a glance

```
FastF1 ──► python/f1pitwall ──► public-data/*.json ──► apps/web (Vercel) ──► browser
                (generate)         (source of truth)      (dashboard + API)      │
                                                                                 ▼
                                            personal website ◄── @f1pitwall/replay-widget
```

Full write-up: **[docs/architecture.md](docs/architecture.md)** ·
Data spec: **[docs/data-contract.md](docs/data-contract.md)** ·
Case study: **[docs/lesson.md](docs/lesson.md)**.

```
f1-pitwall/
├── apps/web/                 # Next.js dashboard + CORS API routes (Vercel)
├── packages/
│   ├── shared/               # Zod schemas + TS types for the JSON contracts
│   └── replay-widget/        # reusable React/Canvas replay engine + widget
├── python/f1pitwall/         # FastF1 adapters, frame generator, exporters, CLI
├── public-data/              # generated JSON (committed source of truth)
└── docs/                     # architecture, data-contract, lesson
```

## Quick start

Prerequisites: **Node ≥ 20**, **pnpm ≥ 9**, **Python ≥ 3.10**.

```bash
# 1. Install JS deps and run the dashboard
pnpm install
pnpm dev                      # http://localhost:3000

# 2. (optional) Set up the Python pipeline
python3 -m venv .venv && source .venv/bin/activate
pip install -e '.[dev]'       # add ',data' for real FastF1: pip install -e '.[dev,data]'
pytest                        # run the pipeline tests
```

The dashboard renders from the committed `public-data/` out of the box — no
Python required just to see it work. A `/widget-demo` route shows the compact,
autoplay embed.

Copy `.env.example` to `.env` if you want to override paths (all optional).

## Data pipeline

```bash
# Generate a polished synthetic sample (no network needed)
python -m f1pitwall generate-replay --demo

# Real data (requires the data extra: pip install -e '.[data]')
python -m f1pitwall generate-replay --year 2026 --race latest
python -m f1pitwall generate-replay --year 2026 --race "British Grand Prix"
python -m f1pitwall generate-season-index --year 2026     # season index + next race

# Experimental (Phase 3, currently a documented stub)
python -m f1pitwall predict-podium --year 2026 --race next
```

Output lands in `public-data/` and is picked up by the dashboard on the next
`pnpm dev`/`build`. See **[docs/data-contract.md](docs/data-contract.md)** for the
exact JSON shape.

> **On real full-race replays:** the pipeline runs end-to-end on real 2026 data,
> but the current JSON framing is too large for a full race at a good frame rate.
> The committed default replay is therefore the synthetic sample (small, correct,
> great-looking); the real 2026 **schedule** and **next race** _are_ live data. A
> structure-of-arrays encoding for real full-race replays is Phase 2. Details in
> [docs/lesson.md](docs/lesson.md).

## Consuming the data from another site

Static files (primary) are CORS-enabled for any origin:

```
https://<your-deploy>.vercel.app/data/latest-replay.json
https://<your-deploy>.vercel.app/data/next-race.json
https://<your-deploy>.vercel.app/data/season-index.json
```

Convenience API aliases: `/api/latest-replay`, `/api/next-race`,
`/api/season-index`. Or drop in the widget:

```tsx
import { RaceReplayWidget } from '@f1pitwall/replay-widget';
import '@f1pitwall/replay-widget/styles.css';

<RaceReplayWidget
  replayUrl="https://f1-pitwall.vercel.app/data/latest-replay.json"
  compact
  autoplay
  showControls={false}
  showNextRace
/>;
```

## Deployment (Vercel)

1. Import the repo into Vercel.
2. **Root Directory:** `apps/web`.
3. Framework preset **Next.js** (build/install commands are auto-detected; the
   monorepo install runs from the repo root, and `vercel.json` sets the pnpm build).
4. No environment variables are required for Phase 1.

The generated JSON is committed, so a deploy needs no Python. To refresh data,
run the pipeline locally (or via the GitHub Action) and commit `public-data/`.

## Scripts

| Command                                                  | What it does                     |
| -------------------------------------------------------- | -------------------------------- |
| `pnpm dev`                                               | Run the dashboard locally        |
| `pnpm build`                                             | Build all packages + the web app |
| `pnpm lint` / `pnpm typecheck` / `pnpm test`             | Lint, typecheck, unit tests (JS) |
| `pytest` · `ruff check python` · `mypy python/f1pitwall` | Python tests / lint / types      |

## Disclaimer

This is an unofficial educational/portfolio project. It is not affiliated with
Formula 1, FIA, Formula One Management, teams, drivers, or official broadcasters.
Data comes from public/unofficial sources and may be incomplete or delayed.
"Formula 1", "F1", and related marks belong to their respective owners.

## Roadmap

- **Phase 1 (this repo)** — monorepo, dashboard, reusable widget, replay pipeline,
  real 2026 schedule, synthetic sample replay, docs. ✅
- **Phase 2** — structure-of-arrays replay encoding for efficient real full-race
  replays; timing gaps/intervals; richer per-season data.
- **Phase 3** — experimental podium prediction pipeline + dashboard section.
- **Phase 4** — scheduled data-refresh GitHub Action; polish; live-ish mode.

## License

[MIT](LICENSE). The two projects that inspired this one
([f1-race-replay](https://github.com/IAmTomShaw/f1-race-replay),
[2025_f1_predictions](https://github.com/mar-antaya/2025_f1_predictions)) were
used as **concept references only** — this codebase is an independent
implementation.
