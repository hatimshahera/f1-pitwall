"""Pure, dependency-light frame assembly.

The core idea (adapted from the reference desktop replay, but reimplemented): put
every car on ONE shared, uniform time grid via linear resampling, then emit a plain
list of frames. The browser interpolates between frames for smooth motion, so a
low frame rate (e.g. 10 fps) keeps the JSON small while still looking good.

Only numpy is required here, so this module is fully unit-testable without FastF1.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from f1pitwall.models import Bounds, CarStatus, CarTrack, Timeline


@dataclass
class CarSamples:
    """One car's telemetry already resampled onto the shared timeline.

    All arrays share the timeline length. ``progress`` is a monotonically
    increasing along-track distance used purely for ranking cars each frame.
    """

    driver_number: str
    xs: np.ndarray
    ys: np.ndarray
    progress: np.ndarray
    laps: np.ndarray
    compounds: list[str | None]
    # Official per-frame classified position, when available (real data). When
    # None, cars are ranked by ``progress`` instead (synthetic data).
    positions: np.ndarray | None = None
    # Index after which the car is no longer running (retirement); None = ran to end.
    retire_index: int | None = None


def make_timeline(duration_sec: float, frame_rate: float) -> np.ndarray:
    """Uniform time grid from 0..duration inclusive at ``frame_rate`` samples/sec."""
    if duration_sec <= 0:
        return np.array([0.0])
    step = 1.0 / frame_rate
    n = int(np.floor(duration_sec / step)) + 1
    return np.arange(n) * step


def choose_frame_rate(duration_sec: float, requested_fps: float, max_frames: int) -> float:
    """Cap the frame rate so a long race doesn't produce an enormous payload.

    A full race is ~90 min; at 10 fps that would be ~54k frames. We downsample to
    stay under ``max_frames`` and rely on the browser's frame interpolation for
    smoothness. This is a deliberate size/accuracy trade-off (see docs).
    """
    if duration_sec <= 0:
        return requested_fps
    max_fps_for_budget = max_frames / duration_sec
    return min(requested_fps, max_fps_for_budget)


def resample(src_times: np.ndarray, src_values: np.ndarray, timeline: np.ndarray) -> np.ndarray:
    """Linearly resample ``src_values`` (sampled at ``src_times``) onto ``timeline``.

    Values outside the source range are held at the nearest endpoint (np.interp
    default), which is the desired "car sits at start/finish" behaviour.
    """
    if len(src_times) == 0:
        return np.zeros_like(timeline)
    order = np.argsort(src_times)
    return np.interp(timeline, np.asarray(src_times)[order], np.asarray(src_values)[order])


def resample_polyline(
    xs: np.ndarray, ys: np.ndarray, target_points: int
) -> list[tuple[float, float]]:
    """Downsample a track polyline to ~``target_points`` evenly-indexed points."""
    n = len(xs)
    if n == 0:
        return []
    if n <= target_points:
        return [(float(x), float(y)) for x, y in zip(xs, ys, strict=True)]
    idx = np.linspace(0, n - 1, target_points).round().astype(int)
    return [(float(xs[i]), float(ys[i])) for i in idx]


def compute_bounds(points: list[tuple[float, float]]) -> Bounds:
    arr = np.asarray(points, dtype=float)
    return Bounds(
        min_x=float(arr[:, 0].min()),
        max_x=float(arr[:, 0].max()),
        min_y=float(arr[:, 1].min()),
        max_y=float(arr[:, 1].max()),
    )


def _frame_sort_key(car: CarSamples, fi: int, retired: bool) -> tuple[int, float]:
    """Ordering key for a car at frame ``fi``.

    Retired cars sort last. Otherwise use the official classified position when
    present (ascending = ahead); fall back to along-track progress (more =
    ahead) for synthetic data that has no official positions.
    """
    if retired:
        return (1, float(fi))
    if car.positions is not None:
        return (0, float(car.positions[fi]))
    return (0, -float(car.progress[fi]))


def _rle_segments(values: list) -> list[tuple[int, object]]:
    """Run-length-encode a per-frame list into ``[start_index, value]`` segments."""
    segments: list[tuple[int, object]] = []
    for i, v in enumerate(values):
        if not segments or segments[-1][1] != v:
            segments.append((i, v))
    return segments


def _leader_gaps(timeline: np.ndarray, cars: list[CarSamples]) -> dict[str, np.ndarray]:
    """Time gap (seconds) to the race leader per car per frame.

    The "leading edge" of the race is the per-frame max progress across all cars;
    inverting its (monotonic) progress→time curve tells us when the leader reached
    any track position. A follower's gap is then ``now − leader_time(its
    progress)`` — the standard time-gap definition, computed from the replay's own
    progress curves.
    """
    t_arr = np.asarray(timeline, dtype=float)
    # The leading edge only moves forward; accumulate the per-frame max so the
    # progress->time curve is monotonic for np.interp. Per-car progress is clean
    # (cumulative Distance in metres), so this doesn't lock onto any spike.
    leader_progress = np.maximum.accumulate(np.vstack([c.progress for c in cars]).max(axis=0))
    gaps: dict[str, np.ndarray] = {}
    for car in cars:
        lead_time = np.interp(car.progress, leader_progress, t_arr)
        gaps[car.driver_number] = np.clip(t_arr - lead_time, 0.0, None)
    return gaps


def _apply_final_order(
    cars: list[CarSamples], ranked: list[CarSamples], final_order: list[str]
) -> list[CarSamples]:
    """Reorder the final frame by official classification, then any others by rank."""
    by_number = {c.driver_number: c for c in cars}
    classified = [by_number[dn] for dn in final_order if dn in by_number]
    seen = {c.driver_number for c in classified}
    rest = [c for c in ranked if c.driver_number not in seen]
    return classified + rest


def assemble_car_tracks(
    timeline: np.ndarray,
    cars: list[CarSamples],
    *,
    final_order: list[str] | None = None,
) -> tuple[Timeline, list[CarTrack]]:
    """Build the structure-of-arrays replay body from per-driver samples.

    For every frame, cars are ranked by :func:`_frame_sort_key` and renumbered to
    a gap-free ``1..N`` permutation. Each car's position/status/compound plus the
    timing gap to the leader are written into parallel per-frame arrays; status and
    compound are stored as run-length change-segments to keep the payload small.
    Retired cars are ranked last and marked RETIRED; the leader on the final frame
    is marked FINISHED.

    ``final_order`` (a list of driver numbers in official finishing order) pins the
    LAST frame to the classified result. On-track distance is unreliable at a
    trimmed finish (cars mid-lap, occasional telemetry gaps), so the closing
    leaderboard uses the authoritative classification while the race itself keeps
    the lively on-track order.
    """
    n = len(timeline)
    last_index = n - 1

    positions: dict[str, list[int]] = {c.driver_number: [0] * n for c in cars}
    statuses: dict[str, list[CarStatus]] = {c.driver_number: ["RUNNING"] * n for c in cars}
    gap_to_leader: dict[str, list[float | None]] = {c.driver_number: [None] * n for c in cars}
    leader_gaps = _leader_gaps(timeline, cars)

    for fi in range(n):
        ranked = sorted(
            cars,
            key=lambda car: _frame_sort_key(
                car, fi, car.retire_index is not None and fi > car.retire_index
            ),
        )
        if fi == last_index and final_order:
            ranked = _apply_final_order(cars, ranked, final_order)
        for rank, car in enumerate(ranked, start=1):
            dn = car.driver_number
            positions[dn][fi] = rank
            if car.retire_index is not None and fi > car.retire_index:
                statuses[dn][fi] = "RETIRED"
                continue
            if fi == last_index and rank == 1:
                statuses[dn][fi] = "FINISHED"
            gap_to_leader[dn][fi] = 0.0 if rank == 1 else round(float(leader_gaps[dn][fi]), 1)

    car_tracks: list[CarTrack] = []
    for car in cars:
        dn = car.driver_number
        # Retired cars hold their last-known position for the remaining frames.
        xs = car.xs.copy()
        ys = car.ys.copy()
        if car.retire_index is not None and car.retire_index < last_index:
            xs[car.retire_index + 1 :] = xs[car.retire_index]
            ys[car.retire_index + 1 :] = ys[car.retire_index]

        car_tracks.append(
            CarTrack(
                driver_number=dn,
                x=[round(float(v), 1) for v in xs],
                y=[round(float(v), 1) for v in ys],
                position=positions[dn],
                gap_to_leader=gap_to_leader[dn],
                # `interval` (gap to car ahead) is derived on the client from
                # gap_to_leader + running order, so it isn't stored.
                interval=None,
                status_segments=_rle_segments(statuses[dn]),  # type: ignore[arg-type]
                compound_segments=_rle_segments(car.compounds),  # type: ignore[arg-type]
            )
        )

    lap = [int(max((car.laps[fi] for car in cars), default=0)) for fi in range(n)]
    tl = Timeline(t=[round(float(t), 3) for t in timeline], lap=lap)
    return tl, car_tracks
