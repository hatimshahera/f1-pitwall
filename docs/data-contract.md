# Data Contract

Every JSON document the pipeline emits is validated on **both** sides of the
system:

- **Python** (`python/f1pitwall/models.py`) — pydantic models validate before writing.
- **TypeScript** (`packages/shared`) — Zod schemas validate before rendering.

The two are kept in lock-step. A cross-language test
(`packages/shared/test/generated-data.test.ts`) validates the committed
`public-data/` files against the Zod schemas, so drift fails CI.

`schemaVersion` is currently **`2.0`** (the replay uses a structure-of-arrays
encoding — see below). Bump the major component for any breaking change so
consumers can detect incompatibility instead of mis-rendering.

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

## Replay (structure-of-arrays)

A replay is a **precomputed, uniform-timeline animation** in a
**structure-of-arrays (SoA)** layout: one shared `timeline`, plus one `CarTrack`
per driver holding parallel arrays indexed by frame. This avoids repeating a key
for every car in every frame, so a full ~90-minute race stays a few MB instead of
tens. The browser plays the timeline back and **linearly interpolates** car
positions between frames, so a low frame rate still looks smooth.

```jsonc
{
  "meta": {
    "schemaVersion": "2.0",
    "year": 2026,
    "raceName": "British Grand Prix",
    "session": "R",              // R | Q | S | SQ | FP1 | FP2 | FP3
    "frameRate": 1.53,           // frames/sec of `timeline` (adaptive for real races)
    "generatedAt": "2026-07-06T12:00:00Z",
    "dataSources": ["FastF1"],   // or ["synthetic"] for the sample
    "disclaimer": "This is an unofficial educational/portfolio project. …"
  },
  "track": {
    "name": "Silverstone",
    "points": [[x, y], …],       // centerline (racing line) polyline, world coords
    "bounds": { "minX": -2315, "maxX": 7782, "minY": -4115, "maxY": 13114 },
    "rotation": 1.606,           // radians, applied about bounds center (Silverstone ≈ 92°)
    "width": 200                 // world-unit track width, for the boundary ribbon
  },
  "drivers": [
    { "driverNumber": "16", "code": "LEC", "name": "Charles Leclerc",
      "team": "Ferrari", "color": "#ED1131" }
  ],
  "timeline": {
    "t":   [0, 0.65, 1.31, …],   // seconds from the start; length = frameCount (N)
    "lap": [1, 1, 2, …]          // global leader lap per frame; length = N
  },
  "cars": [
    {
      "driverNumber": "16",
      "x": [/* N floats */],           // world coords (same space as track.points)
      "y": [/* N floats */],
      "position": [/* N ints */],      // 1..N gap-free permutation each frame
      "gapToLeader": null,             // optional dense array or null (unavailable in 2.0)
      "interval": null,
      "statusSegments":   [[0, "RUNNING"], [7801, "FINISHED"]],
      "compoundSegments": [[0, "MEDIUM"], [1400, "HARD"]]
    }
  ]
}
```

### Change-segments

Slowly-changing fields (`status`, `compound`) are stored as sparse
**`[startFrameIndex, value]`** segments instead of dense arrays. The first segment
starts at frame `0`; a value applies until the next segment. To read the value at
frame `i`, take the last segment whose start `<= i`
(`sampleReplay` in the widget does this). Statuses: `RUNNING | IN_PIT | RETIRED |
FINISHED | UNKNOWN`. Compounds: `SOFT | MEDIUM | HARD | INTERMEDIATE | WET |
UNKNOWN | null`.

### Length invariant

Every dense array (`timeline.lap`, and each car's `x` / `y` / `position` /
`gapToLeader` / `interval`) has the **same length as `timeline.t`**. The Zod
schema enforces this with a `superRefine`, so a malformed replay fails validation
rather than mis-rendering.

### Graceful degradation

Fields the source can't provide are `null`, never fabricated:

- `gapToLeader` / `interval` — `null` in 2.0 (timing gaps are a later item).
- a `compound` segment value may be `null` when tyre data is missing.
- `track.rotation` — `null`/absent means no rotation.

Positions are always a clean `1..N` permutation per frame. Cars are ordered by
**continuous on-track progress** — completed laps plus distance along the racing
line (each car projected onto the centerline, which ignores pit-lane detours) —
so the live leaderboard reorders every frame, and the final order still matches
the official classification. Retirement comes from the official results
**status** (not from telemetry length), so race finishers are never mis-flagged
as retired.

### Coordinates & the track ribbon

`x`/`y` are in the **track's own world coordinate system** (the same space as
`track.points`), not screen pixels. `track.points` is the **centerline** (a real
lap's racing line for real data). The widget:

1. offsets the centerline by `±width/2` along its perpendicular normals to build
   inner/outer boundaries, and fills the ribbon between them
   (`packages/replay-widget/src/core/track.ts`);
2. fits `track.bounds` into the canvas with an aspect-preserving scale, the
   per-circuit `rotation`, and a Y-flip (canvas origin is top-left)
   (`packages/replay-widget/src/core/geometry.ts`).

### Frame budget

Real races use an adaptive frame rate (`choose_frame_rate`) capped at
`max_frames` (default 8000) so a long race stays a few MB; the browser's
interpolation covers the low frame rate. This is a deliberate size/smoothness
trade-off.

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
