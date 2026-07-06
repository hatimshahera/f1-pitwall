"""Deterministic synthetic replay generator.

This produces a polished, good-looking sample replay WITHOUT any network or
FastF1 dependency, so the dashboard always has something to animate and tests
have a stable fixture. It is clearly labelled synthetic (``dataSources:
["synthetic"]``) and uses a fictional event — it does not claim to be a real
race. Driver codes/teams/colours are public facts used only for a representative
look.
"""

from __future__ import annotations

import numpy as np

from f1pitwall import DISCLAIMER, SCHEMA_VERSION
from f1pitwall.models import Replay, ReplayDriver, ReplayMeta, Track
from f1pitwall.replay.frames import (
    CarSamples,
    assemble_frames,
    compute_bounds,
    make_timeline,
)
from f1pitwall.util import now_iso

# A representative 20-car grid (public driver/team facts) for a synthetic sample.
GRID: list[tuple[str, str, str, str, str]] = [
    ("4", "NOR", "Lando Norris", "McLaren", "#F47600"),
    ("81", "PIA", "Oscar Piastri", "McLaren", "#F47600"),
    ("16", "LEC", "Charles Leclerc", "Ferrari", "#E8002D"),
    ("44", "HAM", "Lewis Hamilton", "Ferrari", "#E8002D"),
    ("1", "VER", "Max Verstappen", "Red Bull Racing", "#3671C6"),
    ("22", "TSU", "Yuki Tsunoda", "Red Bull Racing", "#3671C6"),
    ("63", "RUS", "George Russell", "Mercedes", "#27F4D2"),
    ("12", "ANT", "Kimi Antonelli", "Mercedes", "#27F4D2"),
    ("14", "ALO", "Fernando Alonso", "Aston Martin", "#229971"),
    ("18", "STR", "Lance Stroll", "Aston Martin", "#229971"),
    ("10", "GAS", "Pierre Gasly", "Alpine", "#0093CC"),
    ("7", "DOO", "Jack Doohan", "Alpine", "#0093CC"),
    ("23", "ALB", "Alexander Albon", "Williams", "#64C4FF"),
    ("55", "SAI", "Carlos Sainz", "Williams", "#64C4FF"),
    ("6", "HAD", "Isack Hadjar", "Racing Bulls", "#6692FF"),
    ("30", "LAW", "Liam Lawson", "Racing Bulls", "#6692FF"),
    ("27", "HUL", "Nico Hulkenberg", "Kick Sauber", "#52E252"),
    ("5", "BOR", "Gabriel Bortoleto", "Kick Sauber", "#52E252"),
    ("31", "OCO", "Esteban Ocon", "Haas", "#B6BABD"),
    ("87", "BEA", "Oliver Bearman", "Haas", "#B6BABD"),
]

_COMPOUND_ORDER = ["MEDIUM", "HARD", "SOFT"]


def _build_track(num_dense: int = 2000) -> tuple[np.ndarray, np.ndarray, np.ndarray, float]:
    """A stylised closed circuit as a dense polyline plus its cumulative arc-length."""
    theta = np.linspace(0.0, 2.0 * np.pi, num_dense, endpoint=False)
    radius = 380.0 + 90.0 * np.sin(3.0 * theta) + 45.0 * np.cos(2.0 * theta)
    xs = 520.0 + radius * np.cos(theta)
    ys = 500.0 + radius * np.sin(theta)
    # Close the loop for arc-length continuity.
    xs_closed = np.append(xs, xs[0])
    ys_closed = np.append(ys, ys[0])
    seg = np.hypot(np.diff(xs_closed), np.diff(ys_closed))
    cumulative = np.concatenate([[0.0], np.cumsum(seg)])
    total = float(cumulative[-1])
    return xs_closed, ys_closed, cumulative, total


def _point_at_fraction(
    xs: np.ndarray, ys: np.ndarray, cumulative: np.ndarray, total: float, frac: np.ndarray
) -> tuple[np.ndarray, np.ndarray]:
    """Vectorised lookup of (x, y) at a fractional lap position in [0, 1)."""
    target = (frac % 1.0) * total
    idx = np.searchsorted(cumulative, target, side="right") - 1
    idx = np.clip(idx, 0, len(cumulative) - 2)
    seg_len = cumulative[idx + 1] - cumulative[idx]
    seg_len = np.where(seg_len == 0, 1.0, seg_len)
    local = (target - cumulative[idx]) / seg_len
    x = xs[idx] + (xs[idx + 1] - xs[idx]) * local
    y = ys[idx] + (ys[idx + 1] - ys[idx]) * local
    return x, y


def build_synthetic_replay(
    *,
    year: int = 2026,
    race_name: str = "Sample Grand Prix",
    track_name: str = "Pitwall Park Circuit",
    duration_sec: float = 60.0,
    frame_rate: float = 10.0,
    seed: int = 7,
) -> Replay:
    """Generate a deterministic, visually convincing sample race replay."""
    rng = np.random.default_rng(seed)
    xs_dense, ys_dense, cumulative, total_len = _build_track()

    timeline = make_timeline(duration_sec, frame_rate)
    n = len(timeline)
    last_index = n - 1

    # Pace: laps/sec, faster cars near the front of the grid, with mild per-car
    # oscillation so the order shuffles and cars visibly overtake.
    base_pace = np.linspace(0.055, 0.048, len(GRID)) + rng.normal(0, 0.0007, len(GRID))
    phase = rng.uniform(0, 2 * np.pi, len(GRID))
    stagger = np.linspace(0, 0.05, len(GRID))  # grid gaps at the start

    # One backmarker retires ~65% through the race.
    retire_car = len(GRID) - 2
    retire_index = int(0.65 * last_index)

    cars: list[CarSamples] = []
    for i, (number, _code, _name, _team, _color) in enumerate(GRID):
        laps_float = (
            base_pace[i] * timeline + 0.015 * np.sin(0.35 * timeline + phase[i]) - stagger[i]
        )
        laps_float = np.maximum(laps_float, 0.0)
        x, y = _point_at_fraction(xs_dense, ys_dense, cumulative, total_len, laps_float)
        progress = laps_float * total_len
        laps = np.floor(laps_float).astype(int) + 1

        # Tyre stints: change compound at two pit "laps" per car.
        pit_laps = sorted(rng.choice([1, 2, 3], size=2, replace=False).tolist())
        compounds: list[str | None] = []
        for lap_num in laps:
            stint = sum(1 for pl in pit_laps if lap_num > pl)
            compounds.append(_COMPOUND_ORDER[stint % len(_COMPOUND_ORDER)])

        cars.append(
            CarSamples(
                driver_number=number,
                xs=x,
                ys=y,
                progress=progress,
                laps=laps,
                compounds=compounds,
                retire_index=retire_index if i == retire_car else None,
            )
        )

    frames = assemble_frames(timeline, cars)
    points = [
        (round(float(px), 1), round(float(py), 1))
        for px, py in zip(xs_dense, ys_dense, strict=True)
    ]
    # Downsample the track outline for a compact payload.
    step = max(1, len(points) // 300)
    points = points[::step]

    drivers = [
        ReplayDriver(driver_number=num, code=code, name=name, team=team, color=color)
        for (num, code, name, team, color) in GRID
    ]

    meta = ReplayMeta(
        schema_version=SCHEMA_VERSION,
        year=year,
        race_name=race_name,
        session="R",
        frame_rate=frame_rate,
        generated_at=now_iso(),
        data_sources=["synthetic"],
        disclaimer=DISCLAIMER,
    )
    track = Track(name=track_name, points=points, bounds=compute_bounds(points))

    return Replay(meta=meta, track=track, drivers=drivers, frames=frames)
