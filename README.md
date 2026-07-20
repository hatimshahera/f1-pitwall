# 🏁 f1-pitwall

**An unofficial F1 race-replay dashboard and prediction sandbox, built from
public data.** A Python pipeline turns completed F1 sessions into a compact,
web-friendly JSON contract; a Next.js dashboard (and a reusable React/Canvas
widget) animate it — deployable free on Vercel with no always-on backend.

> **Status:** post-race replay of the real 2026 season (structure-of-arrays
> encoding), reusable widget, and an experimental prediction scaffold. See the
> [roadmap](#roadmap).

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
                                            personal website ◄── @hatimshahera/f1-pitwall-replay-widget
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
```

### Publishing the widget to npm

`@hatimshahera/f1-pitwall-replay-widget` is set up to publish as a self-contained package
(bundles `@f1pitwall/shared` + zod; React stays a peer). From the repo root:

```bash
npm login                                                  # once
# the @f1pitwall scope needs a (free) npm org of that name, or rename the package
pnpm --filter @hatimshahera/f1-pitwall-replay-widget publish --access public
```

`prepublishOnly` builds `dist/` (JS + types + `styles.css`) automatically. In-repo,
the dashboard keeps consuming the TypeScript source — `publishConfig` only swaps
the entry points to `dist/` at publish time.

**Experimental podium predictions** are developed interactively in a notebook, not
via the CLI. `pip install -e '.[predictions]'`, then open
`notebooks/podium_predictions.ipynb`: the project provides the data loader and the
JSON-export plumbing (`f1pitwall.predictions`), and you build the features/model.
Exporting writes `public-data/predictions/next.json`, which the dashboard's
"Experimental Predictions" panel renders.

Output lands in `public-data/` and is picked up by the dashboard on the next
`pnpm dev`/`build`. See **[docs/data-contract.md](docs/data-contract.md)** for the
exact JSON shape.

> **On the data:** the default replay is the **real 2026 Belgian Grand Prix**
> (real Spa-Francorchamps outline, correct finishing order), encoded with the
> structure-of-arrays format so a full race stays only a few MB. A polished
> **synthetic** sample is also included (and used by tests / offline `--demo`).
> The real 2026 **schedule** and **next race** are live FastF1 data. Details in
> [docs/lesson.md](docs/lesson.md).

## Consuming the data from another site

Static files (primary) are CORS-enabled for any origin:

```
https://f1-pitwall-web.vercel.app/data/latest-replay.json
https://f1-pitwall-web.vercel.app/data/next-race.json
https://f1-pitwall-web.vercel.app/data/season-index.json
```

Convenience API aliases: `/api/latest-replay`, `/api/next-race`,
`/api/season-index`. Or drop in the widget:

```tsx
import { RaceReplayWidget } from '@hatimshahera/f1-pitwall-replay-widget';
import '@hatimshahera/f1-pitwall-replay-widget/styles.css';

<RaceReplayWidget
  replayUrl="https://f1-pitwall-web.vercel.app/data/latest-replay.json"
  nextRaceUrl="https://f1-pitwall-web.vercel.app/data/next-race.json"
  compact
  autoplay
  speed={4} // 4× playback
  showControls={false}
  leaderboardLimit={3} // top-3 strip near the track
  showNextRace
/>;
```

## Deployment (Vercel)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/hatimshahera/f1-pitwall&project-name=f1-pitwall&repository-name=f1-pitwall&root-directory=apps/web)

Or manually:

1. Import the repo into Vercel.
2. Set **Root Directory** to `apps/web` (Vercel still checks out the whole repo,
   so the build can read the top-level `public-data/`).
3. Framework preset **Next.js**. `apps/web/vercel.json` pins the pnpm
   install/build; the workspace install runs from the monorepo root automatically.
4. No environment variables are required.

The generated JSON is committed, so a deploy needs **no Python** — the build's
`copy-data` step copies `public-data/` into the app's static output. To refresh
the data, run the pipeline locally or trigger the **Generate data** GitHub Action,
which commits `public-data/` back (the next deploy picks it up).

## Scripts

| Command                                                  | What it does                     |
| -------------------------------------------------------- | -------------------------------- |
| `pnpm dev`                                               | Run the dashboard locally        |
| `pnpm build`                                             | Build all packages + the web app |
| `pnpm lint` / `pnpm typecheck` / `pnpm test`             | Lint, typecheck, unit tests (JS) |
| `pytest` · `ruff check python` · `mypy python/f1pitwall` | Python tests / lint / types      |

## Credits & inspiration

This project was **inspired by** two open-source projects, used as concept
references only — the code here is an independent implementation:

- [**IAmTomShaw/f1-race-replay**](https://github.com/IAmTomShaw/f1-race-replay) —
  the desktop replay whose "resample every car onto one clock, then play plain
  frames" idea and racing-line → track-ribbon rendering shaped the replay engine.
- [**mar-antaya/2025_f1_predictions**](https://github.com/mar-antaya/2025_f1_predictions)
  — the prediction project whose feature ideas (qualifying pace, constructor
  strength, form) informed the podium-prediction scaffolding.

Thanks to both authors. Data via [FastF1](https://docs.fastf1.dev/).

## Disclaimer

This is an unofficial educational/portfolio project. It is not affiliated with
Formula 1, FIA, Formula One Management, teams, drivers, or official broadcasters.
Data comes from public/unofficial sources and may be incomplete or delayed.
"Formula 1", "F1", and related marks belong to their respective owners.

## Roadmap

- **Phase 1** — monorepo, dashboard, reusable widget, replay pipeline, real 2026
  schedule, synthetic sample replay, docs. ✅
- **Phase 2** — structure-of-arrays replay encoding (schemaVersion 2.0), real
  full-race replays (latest completed GP as default), track ribbon + per-circuit
  rotation, correct results-based ordering/retirement. ✅
- **Phase 3** — experimental podium predictions: notebook workspace + data/export
  scaffolding wired to the dashboard's predictions panel (modelling is a WIP). 🚧
- **Phase 4** — timing gaps to the leader in the replay/leaderboard; weekly
  data-refresh GitHub Action; Vercel deploy button. ✅
- **Later** — live-ish mode (the timeline is already an append-friendly stream).

## License

[MIT](LICENSE). The two projects that inspired this one
([f1-race-replay](https://github.com/IAmTomShaw/f1-race-replay),
[2025_f1_predictions](https://github.com/mar-antaya/2025_f1_predictions)) were
used as **concept references only** — this codebase is an independent
implementation.

## Support

If this project is useful or you'd like to support the work:

☕ **[Buy me a coffee](https://buymeacoffee.com/hatimshahera)**
