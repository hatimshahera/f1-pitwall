"""FastF1 adapter: load real sessions and convert them to the replay contract.

FastF1 (and pandas) are imported lazily inside functions so that importing this
module never fails when the optional ``data`` extra isn't installed. Callers
should catch :class:`FastF1Unavailable`.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np

from f1pitwall import DISCLAIMER, SCHEMA_VERSION
from f1pitwall.models import (
    NextRace,
    RaceSession,
    Replay,
    ReplayDriver,
    ReplayMeta,
    Track,
)
from f1pitwall.replay.frames import (
    CarSamples,
    assemble_car_tracks,
    choose_frame_rate,
    compute_bounds,
    make_timeline,
    resample,
    resample_polyline,
)
from f1pitwall.util import now_iso


class FastF1Unavailable(RuntimeError):
    """Raised when FastF1/data dependencies are missing or a session can't load."""


@dataclass
class ScheduleInfo:
    """Resolved season schedule facts used for indexes and the next-race card."""

    completed: list[dict]  # each: {round, raceName, date, session}
    next_race: NextRace | None


def _import_fastf1():
    try:
        import fastf1  # noqa: PLC0415

        return fastf1
    except Exception as exc:  # pragma: no cover - exercised only without the extra
        raise FastF1Unavailable(
            "FastF1 is not installed. Install the data extra: pip install -e '.[data]'"
        ) from exc


def _enable_cache(cache_dir: Path) -> None:
    fastf1 = _import_fastf1()
    cache_dir.mkdir(parents=True, exist_ok=True)
    fastf1.Cache.enable_cache(str(cache_dir))


def resolve_schedule(year: int, cache_dir: Path, *, now_utc=None) -> ScheduleInfo:
    """Return completed rounds and the next upcoming race for ``year``."""
    import pandas as pd  # noqa: PLC0415

    fastf1 = _import_fastf1()
    _enable_cache(cache_dir)

    schedule = fastf1.get_event_schedule(year, include_testing=False)
    now = pd.Timestamp.utcnow().tz_localize(None) if now_utc is None else pd.Timestamp(now_utc)

    completed: list[dict] = []
    next_race: NextRace | None = None
    for _, ev in schedule.iterrows():
        race_date = ev.get("Session5DateUtc") or ev.get("EventDate")
        race_ts = pd.Timestamp(race_date) if race_date is not None else None
        date_str: str | None = None if race_ts is None else race_ts.isoformat() + "Z"
        info: dict = {
            "round": int(ev["RoundNumber"]),
            "raceName": str(ev["EventName"]),
            "date": date_str,
            "session": "R",
        }
        if race_ts is not None and race_ts < now:
            completed.append(info)
        elif next_race is None and race_ts is not None:
            next_race = NextRace(
                year=year,
                race_name=str(ev["EventName"]),
                round=int(ev["RoundNumber"]),
                circuit=str(ev.get("Location") or ev.get("OfficialEventName") or ev["EventName"]),
                country=str(ev.get("Country")) if ev.get("Country") is not None else None,
                date=date_str,
                sessions=[RaceSession(name="Race", starts_at=date_str)],
                generated_at=now_iso(),
            )

    return ScheduleInfo(completed=completed, next_race=next_race)


def load_race_session(year: int, race: str | int, cache_dir: Path, session_code: str = "R"):
    """Load and fully populate a race session. ``race`` is a round number or name."""
    fastf1 = _import_fastf1()
    _enable_cache(cache_dir)
    try:
        session = fastf1.get_session(year, race, session_code)
        session.load(laps=True, telemetry=True, weather=False, messages=False)
    except Exception as exc:
        raise FastF1Unavailable(
            f"Could not load session {year} {race} {session_code}: {exc}"
        ) from exc
    return session


def _centerline_arclength(
    points: list[tuple[float, float]],
) -> tuple[np.ndarray, np.ndarray, np.ndarray, float]:
    """Return centerline X, Y, cumulative arc-length, and total length."""
    arr = np.asarray(points, dtype=float)
    cx, cy = arr[:, 0], arr[:, 1]
    seg = np.hypot(np.diff(cx, prepend=cx[:1]), np.diff(cy, prepend=cy[:1]))
    cum = np.cumsum(seg)
    return cx, cy, cum, float(cum[-1])


def _race_progress(
    xs: np.ndarray,
    ys: np.ndarray,
    laps: np.ndarray,
    cx: np.ndarray,
    cy: np.ndarray,
    cum: np.ndarray,
    track_len: float,
) -> np.ndarray:
    """Continuous race progress = ``official lap`` + within-lap fraction.

    Each car position is projected onto the nearest centerline point (ignoring
    pit-lane detours, unlike raw path length) to get a within-lap fraction in
    [0, 1), which the live leaderboard uses to reorder every frame. Cross-lap
    order comes from the **official lap number**, which is reliable — so a
    mis-projection near the start/finish line (where the nearest point can snap to
    the far end of the line) can only nudge same-lap ordering for a single frame,
    never lock a car a whole lap ahead. Deliberately NO cumulative
    ``maximum.accumulate`` here: that previously locked in such a bogus jump for
    the rest of the race and scrambled the order.
    """
    dx = xs[:, None] - cx[None, :]
    dy = ys[:, None] - cy[None, :]
    nearest = np.argmin(dx * dx + dy * dy, axis=1)
    fraction = cum[nearest] / track_len if track_len > 0 else np.zeros_like(cum[nearest])
    progress = np.maximum(laps - 1, 0) + fraction
    # A car exactly on the start/finish line can snap to the far end of the
    # centerline, spiking its fraction to ~1 for a single frame. Median-filter it
    # out so it neither blips the order nor (via the leader envelope) inflates gaps.
    return _median3(progress)


def _median3(a: np.ndarray) -> np.ndarray:
    """3-point median filter — removes single-frame spikes, numpy-only."""
    prev = np.concatenate([a[:1], a[:-1]])
    nxt = np.concatenate([a[1:], a[-1:]])
    return np.median(np.stack([prev, a, nxt]), axis=0)


def _circuit_rotation_radians(session) -> float | None:
    """Per-circuit display rotation (radians) from FastF1, matching TV orientation."""
    try:
        rot = session.get_circuit_info().rotation
        return None if rot is None else float(np.deg2rad(rot))
    except Exception:
        return None


def _classification(results, pd) -> tuple[dict[str, bool], str | None]:
    """Map driverNumber -> is_retired (from official Status) and find the winner.

    A driver is a classified finisher when Status is 'Finished' or '+N Lap(s)';
    anything else (DNF, Accident, Retired, …) counts as retired. This replaces the
    old data-ends-early heuristic that wrongly flagged race winners as retired.
    """
    retired: dict[str, bool] = {}
    winner: str | None = None
    try:
        for _, row in results.iterrows():
            dn = str(row["DriverNumber"])
            status = str(row.get("Status") or "")
            retired[dn] = not (status.startswith("Finished") or status.startswith("+"))
            classified = row.get("Position")
            if classified is not None and not pd.isna(classified) and int(classified) == 1:
                winner = dn
    except Exception:
        pass
    return retired, winner


def build_replay_from_session(
    session, *, frame_rate: float = 5.0, track_points: int = 400, max_frames: int = 8000
) -> Replay:
    """Convert a loaded FastF1 race session into a validated Replay model (SoA)."""
    import pandas as pd  # noqa: PLC0415

    laps = session.laps
    if laps is None or len(laps) == 0:
        raise FastF1Unavailable("Session has no lap data to build a replay from.")

    # Collect each driver's position telemetry and a common t0/t_end.
    driver_numbers = [str(d) for d in session.drivers]
    per_driver_pos: dict[str, pd.DataFrame] = {}
    t0 = None
    t_end = None
    for drv in driver_numbers:
        try:
            pos = laps.pick_drivers(drv).get_pos_data()
        except Exception:
            continue
        if pos is None or len(pos) == 0 or "X" not in pos:
            continue
        pos = pos.dropna(subset=["X", "Y"]).sort_values("SessionTime")
        if len(pos) < 2:
            continue
        per_driver_pos[drv] = pos
        start = pos["SessionTime"].iloc[0]
        end = pos["SessionTime"].iloc[-1]
        t0 = start if t0 is None else min(t0, start)
        t_end = end if t_end is None else max(t_end, end)

    if not per_driver_pos or t0 is None or t_end is None:
        raise FastF1Unavailable("No usable position data found for any driver.")

    results = session.results
    retired_map, winner = _classification(results, pd)

    # Trim the timeline to the leader's finish so cool-down laps aren't replayed.
    duration = (t_end - t0).total_seconds()
    if winner is not None:
        try:
            finish = (laps.pick_drivers(winner)["Time"].dropna().max() - t0).total_seconds()
            if finish and finish > 0:
                duration = min(duration, finish + 2.0)
        except Exception:
            pass

    effective_fps = choose_frame_rate(duration, frame_rate, max_frames)
    timeline = make_timeline(duration, effective_fps)
    last_index = len(timeline) - 1

    # Track centerline from the fastest lap (the racing line).
    try:
        ref_pos = laps.pick_fastest().get_pos_data().dropna(subset=["X", "Y"])
        points = resample_polyline(
            ref_pos["X"].to_numpy(dtype=float), ref_pos["Y"].to_numpy(dtype=float), track_points
        )
    except Exception:
        any_pos = next(iter(per_driver_pos.values()))
        points = resample_polyline(
            any_pos["X"].to_numpy(dtype=float), any_pos["Y"].to_numpy(dtype=float), track_points
        )
    points = [(round(px, 1), round(py, 1)) for px, py in points]
    cx, cy, cum, track_len = _centerline_arclength(points)

    cars: list[CarSamples] = []
    drivers_meta: list[ReplayDriver] = []

    for drv, pos in per_driver_pos.items():
        src_t = (pos["SessionTime"] - t0).dt.total_seconds().to_numpy()
        xs = resample(src_t, pos["X"].to_numpy(dtype=float), timeline)
        ys = resample(src_t, pos["Y"].to_numpy(dtype=float), timeline)

        # Lap number per frame (step function from lap start times).
        drv_laps = laps.pick_drivers(drv).sort_values("LapNumber")
        lap_starts = (drv_laps["LapStartTime"] - t0).dt.total_seconds().to_numpy()
        lap_numbers = drv_laps["LapNumber"].to_numpy(dtype=int)
        lap_idx = np.clip(
            np.searchsorted(lap_starts, timeline, side="right") - 1, 0, len(lap_numbers) - 1
        )
        laps_arr = lap_numbers[lap_idx]

        compounds = drv_laps["Compound"].astype("string").fillna("UNKNOWN").to_numpy()
        compound_per_frame = [_normalise_compound(compounds[i]) for i in lap_idx]

        # Continuous on-track progress (laps + along-centerline distance), so the
        # leaderboard reorders every frame rather than once per lap.
        progress = _race_progress(xs, ys, laps_arr, cx, cy, cum, track_len)

        # Retirement comes from the official classification, not the data length.
        retire_index = None
        if retired_map.get(drv, False) and src_t[-1] < duration - 2.0:
            retire_index = int(np.clip(np.searchsorted(timeline, src_t[-1]), 0, last_index))

        cars.append(
            CarSamples(
                driver_number=drv,
                xs=xs,
                ys=ys,
                progress=progress,
                laps=laps_arr,
                compounds=compound_per_frame,
                positions=None,
                retire_index=retire_index,
            )
        )
        drivers_meta.append(_driver_meta(drv, results))

    tl, car_tracks = assemble_car_tracks(timeline, cars)

    event_name = session.event["EventName"]
    meta = ReplayMeta(
        schema_version=SCHEMA_VERSION,
        year=int(session.event.year),
        race_name=str(event_name),
        session="R",
        frame_rate=round(effective_fps, 3),
        generated_at=now_iso(),
        data_sources=["FastF1"],
        disclaimer=DISCLAIMER,
    )
    track = Track(
        name=str(session.event.get("Location", event_name)),
        points=points,
        bounds=compute_bounds(points),
        rotation=_circuit_rotation_radians(session),
        width=200.0,
    )
    return Replay(meta=meta, track=track, drivers=drivers_meta, timeline=tl, cars=car_tracks)


def _normalise_compound(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip().upper()
    valid = {"SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"}
    if text in valid:
        return text
    return None if text in {"", "NAN", "NONE", "UNKNOWN"} else "UNKNOWN"


_DEFAULT_COLOR = "#9aa0a6"


def _driver_meta(driver_number: str, results) -> ReplayDriver:
    code = driver_number
    name = driver_number
    team = "Unknown"
    color = _DEFAULT_COLOR
    try:
        row = results.loc[results["DriverNumber"] == driver_number].iloc[0]
        code = str(row.get("Abbreviation") or driver_number)
        first = str(row.get("FirstName") or "").strip()
        last = str(row.get("LastName") or "").strip()
        name = (f"{first} {last}").strip() or code
        team = str(row.get("TeamName") or "Unknown")
        team_color = row.get("TeamColor")
        if isinstance(team_color, str) and team_color:
            color = team_color if team_color.startswith("#") else f"#{team_color}"
    except Exception:
        pass
    return ReplayDriver(driver_number=driver_number, code=code, name=name, team=team, color=color)
