# Data Contract

Every JSON document the pipeline emits is validated on **both** sides of the
system:

- **Python** (`python/f1pitwall/models.py`) — pydantic models validate before writing.
- **TypeScript** (`packages/shared`) — Zod schemas validate before rendering.

The two are kept in lock-step. A cross-language test
(`packages/shared/test/generated-data.test.ts`) validates the committed
`public-data/` files against the Zod schemas, so drift fails CI.

`schemaVersion` is currently **`1.0`**. Bump the major component for any breaking
change so consumers can detect incompatibility instead of mis-rendering.

---

## Files

| File                    | Purpose                                  | Primary URL                   | API alias               |
| ----------------------- | ---------------------------------------- | ----------------------------- | ----------------------- |
| `latest-replay.json`    | Replay of the latest completed race      | `/data/latest-replay.json`    | `/api/latest-replay`    |
| `races/<slug>.json`     | Replay for a specific race               | `/data/races/<slug>.json`     | —                       |
| `season-index.json`     | Current season race list                 | `/data/season-index.json`     | `/api/season-index`     |
| `next-race.json`        | Next upcoming race                       | `/data/next-race.json`        | `/api/next-race`        |
| `predictions/next.json` | Experimental podium prediction (Phase 3) | `/data/predictions/next.json` | `/api/predictions/next` |

Static `/data/*` files are the **primary source** and are served with
`Access-Control-Allow-Origin: *` (see `apps/web/next.config.mjs`), so any origin —
including your personal website — can fetch them directly. The `/api/*` routes
are thin, CORS-enabled convenience wrappers over the same files.

---

## Replay

A replay is a **precomputed, uniform-timeline animation**. Every car is sampled
onto the same set of frame timestamps (`meta.frameRate` fps). The browser plays
the frames back and **linearly interpolates** car positions between them, so a
low frame rate keeps the payload small while motion stays smooth.

```jsonc
{
  "meta": {
    "schemaVersion": "1.0",
    "year": 2026,
    "raceName": "British Grand Prix",
    "session": "R",              // R | Q | S | SQ | FP1 | FP2 | FP3
    "frameRate": 10,             // frames per second in `frames`
    "generatedAt": "2026-07-06T12:00:00Z",
    "dataSources": ["FastF1"],   // or ["synthetic"] for the sample
    "disclaimer": "This is an unofficial educational/portfolio project. …"
  },
  "track": {
    "name": "Silverstone",
    "points": [[x, y], …],       // ordered outline polyline, world coords
    "bounds": { "minX": 0, "maxX": 1000, "minY": 0, "maxY": 1000 },
    "rotation": null             // optional radians, applied before scaling
  },
  "drivers": [
    { "driverNumber": "4", "code": "NOR", "name": "Lando Norris",
      "team": "McLaren", "color": "#F47600" }
  ],
  "frames": [
    {
      "t": 0,                    // seconds from the start of the timeline
      "lap": 1,
      "raceTime": "00:00:00",    // human-readable elapsed race time
      "cars": [
        {
          "driverNumber": "4",
          "x": 123.4, "y": 567.8,      // world coords (match track.points)
          "position": 1,               // 1..N, gap-free permutation each frame
          "gapToLeader": null,         // seconds, or null if unavailable
          "interval": null,            // seconds, or null if unavailable
          "status": "RUNNING",         // RUNNING | IN_PIT | RETIRED | FINISHED | UNKNOWN
          "compound": "MEDIUM"         // SOFT|MEDIUM|HARD|INTERMEDIATE|WET|UNKNOWN|null
        }
      ]
    }
  ]
}
```

### Graceful degradation

Fields that the source can't provide are set to **`null`**, never fabricated:

- `gapToLeader` / `interval` — `null` in v1.0 (timing gaps are a Phase 2 item).
- `compound` — `null` when tyre data is missing.
- `track.rotation` — `null`/absent means no rotation.

Positions are always a clean `1..N` permutation per frame: cars are ordered by
official classified position (real data) or along-track progress (synthetic),
then renumbered. Retired cars sort last and carry `status: "RETIRED"`.

### Coordinates

`x`/`y` are in the **track's own world coordinate system** (the same space as
`track.points`), not screen pixels. The widget fits `track.bounds` into the
canvas with an aspect-preserving scale, a Y-flip (canvas origin is top-left), and
the optional rotation. See `packages/replay-widget/src/core/geometry.ts`.

### A note on size (and Phase 2)

The array-of-objects framing above is readable and matches the spec, but it does
not scale to a **full** race at a high frame rate — repeating every key for every
car in every frame is expensive. A 90-minute race at 10 fps would be tens of MB.
The generator therefore caps real replays with an adaptive frame budget
(`choose_frame_rate`), which trades frame rate for size. The committed default
replay is the **synthetic sample** (small, correct, great-looking).

Phase 2 will introduce a **structure-of-arrays** encoding (per-driver typed
position arrays keyed once) to ship real full-race replays efficiently. That will
be `schemaVersion` `2.0`.

---

## Season index

```jsonc
{
  "year": 2026,
  "generatedAt": "2026-07-06T12:00:00Z",
  "races": [
    {
      "round": 9,
      "raceName": "British Grand Prix",
      "slug": "british-grand-prix",
      "session": "R",
      "hasReplay": false,
      "date": "2026-07-05T14:00:00Z",
    },
  ],
}
```

The dashboard's race selector lists only entries with `hasReplay: true`.

## Next race

```jsonc
{
  "year": 2026,
  "raceName": "Belgian Grand Prix",
  "round": 10,
  "circuit": "Spa-Francorchamps",
  "country": "Belgium",
  "date": "2026-07-19T13:00:00Z", // or null if unknown
  "sessions": [{ "name": "Race", "startsAt": "2026-07-19T13:00:00Z" }],
  "generatedAt": "2026-07-06T12:00:00Z",
}
```

## Predictions (experimental, Phase 3)

```jsonc
{
  "meta": {
    "schemaVersion": "1.0",
    "year": 2026,
    "raceName": "Belgian Grand Prix",
    "round": 10,
    "session": "R",
    "model": "gradient-boosting",
    "generatedAt": "…",
    "experimental": true,
    "disclaimer": "…",
  },
  "drivers": [
    {
      "driverNumber": "4",
      "code": "NOR",
      "name": "Lando Norris",
      "team": "McLaren",
      "predictedRank": 1,
      "podiumProbability": 0.72,
    },
  ],
}
```

`experimental` **must** be `true`. The dashboard renders predictions only in the
clearly-labelled "Experimental Predictions" section, never as fact.
