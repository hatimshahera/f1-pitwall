# Lesson: building f1-pitwall

A short technical case study of the decisions behind this project — what I chose,
why, and where I hit real trade-offs. Not a changelog.

## Why build it

I wanted one project that exercises the full path from **messy real-world data**
to a **polished, embeddable UI**: pull unofficial F1 timing data, turn it into
something a browser can animate at 60 fps, expose it cleanly enough that a
_separate_ website can consume it, and leave room for an ML layer on top. F1 race
data is a great fit — spatial, temporal, and everyone can tell when the
animation looks wrong.

## Why Python for data and TypeScript for the UI

These are two genuinely different jobs, so I let each language do what it's good
at instead of forcing one stack:

- **Python** has the ecosystem for this data: FastF1 wraps the unofficial timing
  API, and pandas/numpy make resampling telemetry onto a common clock a few
  lines. This is batch work that runs occasionally, not per-request.
- **TypeScript/React** is where the interactive, per-frame rendering lives. A
  canvas engine with a `requestAnimationFrame` loop belongs in the browser, and
  a typed component is what makes the widget safely reusable on another site.

The seam between them is a **versioned JSON contract**, validated on both sides
(Zod + pydantic). That's what lets the two halves evolve independently.

## Why static JSON first, not a live backend

The expensive work — loading a session, resampling, building frames — is
occasional and identical for every viewer. So it runs **offline** and the result
is committed as JSON. The web app only reads files.

Consequences, all good for a portfolio project:

- **Free hosting.** No always-on Python service, no database. Vercel's free tier
  serves static files and thin API routes.
- **Trivially shareable.** The data is just files at `/data/*.json` with
  `Access-Control-Allow-Origin: *`, so my personal site fetches them directly —
  no coupling to the dashboard's runtime.
- **Cacheable and reproducible.** A replay is a static artifact; regenerating is
  a CLI command, not a deploy.

The cost is that data is as fresh as the last generation run — fine for
**post-race replay**, which is the whole Phase 1 scope.

## How replay frames work

The one idea worth stealing from the desktop reference replay was
**resample-to-a-common-clock, then ship plain frames**:

1. Put every car on the same uniform time grid via linear resampling
   (`np.interp`). A "frame" becomes simply _everyone's state at time `t`_.
2. Emit a list of `{ t, lap, cars[] }` — data only, no engine state.
3. In the browser, run one rAF loop over a float time and **lerp** car positions
   between frames. The reference app snapped to the nearest frame; interpolating
   in JS means I can ship a low frame rate (small files) and still get smooth
   motion.

Keeping the authoritative playback time in a **ref with a subscription**, rather
than React state, was the detail that mattered: the canvas redraws imperatively
at display rate while the leaderboard/clock re-render at a throttled rate. React
never reconciles 60 times a second.

## How data reaches other sites

The reusable piece is `@f1pitwall/replay-widget`. The personal site will use it
as:

```tsx
<RaceReplayWidget
  replayUrl="https://f1-pitwall.vercel.app/data/latest-replay.json"
  compact
  autoplay
  showControls={false}
  showNextRace
/>
```

It fetches a public JSON URL, validates it against the shared schema, and
animates — no shared runtime, no build coupling. Same engine as the dashboard,
just a smaller wrapper.

## How the prediction pipeline is structured

Deliberately **not** one script per race (the trap the reference predictions repo
fell into — copy-pasted, hardcoded, evaluated on a random split that leaks laps).
Instead it's laid out as a reusable pipeline —
`load → features → train → evaluate → predict → export` — with rank-aware
evaluation (top-3 hit rate, rank correlation) and race-wise cross-validation.
Phase 1 ships the structure and an honest stub; Phase 3 fills it in. Predictions
are experimental and stay off the personal site.

## Trade-offs and the one real mistake

- **The JSON framing doesn't scale to full races.** Array-of-objects (repeating
  every key per car per frame) is readable and matched the spec, but a 90-minute
  race at 10 fps is tens of MB. I proved the real pipeline works end-to-end on the
  2026 British GP, then made the pragmatic call: **commit the polished synthetic
  sample as the default replay**, keep the _real_ schedule (season index +
  next race) which is small and correct, and defer real full-race replays to a
  **structure-of-arrays** encoding in Phase 2. Shipping a correct small thing beat
  shipping a broken big thing.
- **Per-frame position from raw geometry was wrong.** My first ordering used
  cumulative XY distance as a progress proxy; it ranked backmarkers as leaders.
  The fix was to use FastF1's official classified position and renumber to a clean
  `1..N` permutation. Lesson: don't reconstruct a signal the source already gives
  you authoritatively.
- **Interpolation vs. accuracy.** Low frame rate + browser lerp cuts corners
  slightly. For a _replay_ (smoothness over simulation accuracy) that's the right
  trade; it's documented, not hidden.

## Future: live-ish mode

Frames are already time-indexed, so a live source is an append problem, not a
redesign: a generator would poll during a session and append frames, and the
engine would follow the tail instead of stopping at the end. Phase 1 leaves the
hook and builds none of it — post-race replay first.
