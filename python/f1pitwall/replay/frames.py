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

from f1pitwall.models import Bounds, CarFrame, CarStatus, Frame
from f1pitwall.util import format_clock


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


def assemble_frames(timeline: np.ndarray, cars: list[CarSamples]) -> list[Frame]:
    """Build the per-frame car list with clean, gap-free 1..N positions.

    Cars are ordered by :func:`_frame_sort_key` and then renumbered sequentially,
    so the output is always a valid permutation even if the source positions have
    gaps. Retired cars are marked RETIRED and ranked last; the leader on the final
    frame is marked FINISHED.
    """
    frames: list[Frame] = []
    last_index = len(timeline) - 1

    for fi, t in enumerate(timeline):
        ranked = sorted(
            cars,
            key=lambda car: _frame_sort_key(
                car, fi, car.retire_index is not None and fi > car.retire_index
            ),
        )

        car_frames: list[CarFrame] = []
        for rank, car in enumerate(ranked, start=1):
            retired = car.retire_index is not None and fi > car.retire_index
            idx = car.retire_index if (retired and car.retire_index is not None) else fi
            if retired:
                status: CarStatus = "RETIRED"
            elif fi == last_index and rank == 1:
                status = "FINISHED"
            else:
                status = "RUNNING"
            car_frames.append(
                CarFrame(
                    driver_number=car.driver_number,
                    x=round(float(car.xs[idx]), 1),
                    y=round(float(car.ys[idx]), 1),
                    position=rank,
                    gap_to_leader=None,
                    interval=None,
                    status=status,
                    compound=car.compounds[idx],  # type: ignore[arg-type]
                )
            )

        lap = int(max((car.laps[fi] for car in cars), default=0))
        frames.append(
            Frame(
                t=round(float(t), 3),
                lap=lap,
                race_time=format_clock(float(t)),
                cars=car_frames,
            )
        )

    return frames
