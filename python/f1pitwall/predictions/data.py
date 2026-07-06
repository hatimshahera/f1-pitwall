"""Data loading for the (experimental) podium-prediction work.

This is deliberately just the *plumbing*: it turns FastF1 race results into a
tidy pandas DataFrame you can do feature engineering and modelling on yourself
(see ``notebooks/podium_predictions.ipynb``). No modelling lives here.

FastF1/pandas are imported lazily so importing the package never requires the
optional ``predictions`` extra.
"""

from __future__ import annotations

from pathlib import Path


def _import(name: str):
    try:
        return __import__(name)
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(
            f"'{name}' is required for prediction data loading. "
            "Install the extra: pip install -e '.[predictions]'"
        ) from exc


def _dnf(status: str) -> int:
    """1 when the official status is a DNF (not 'Finished' / '+N Lap(s)')."""
    s = str(status or "")
    return 0 if (s.startswith("Finished") or s.startswith("+")) else 1


def load_results(years: list[int], cache_dir: Path, *, verbose: bool = True):
    """Load per-race results for the given seasons into a tidy DataFrame.

    One row per (race, driver). Columns:
        year, round, chrono, race_name, driver_number, code, name, team,
        grid, finish, dnf, points

    ``chrono`` = ``year * 100 + round`` gives a single chronological sort key.
    Only races that have already happened are included. Failures for individual
    races are skipped with a warning rather than aborting the whole load.
    """
    fastf1 = _import("fastf1")
    pd = _import("pandas")

    fastf1.Cache.enable_cache(str(cache_dir))
    now = pd.Timestamp.utcnow().tz_localize(None)
    rows: list[dict] = []

    for year in years:
        schedule = fastf1.get_event_schedule(year, include_testing=False)
        for _, ev in schedule.iterrows():
            race_date = ev.get("Session5DateUtc") or ev.get("EventDate")
            if race_date is None or pd.Timestamp(race_date) >= now:
                continue
            rnd = int(ev["RoundNumber"])
            try:
                session = fastf1.get_session(year, rnd, "R")
                session.load(laps=False, telemetry=False, weather=False, messages=False)
                results = session.results
            except Exception as exc:  # noqa: BLE001
                if verbose:
                    print(f"  skip {year} R{rnd} ({ev['EventName']}): {exc}")
                continue

            for _, r in results.iterrows():
                rows.append(
                    {
                        "year": year,
                        "round": rnd,
                        "chrono": year * 100 + rnd,
                        "race_name": str(ev["EventName"]),
                        "driver_number": str(r.get("DriverNumber")),
                        "code": str(r.get("Abbreviation") or r.get("DriverNumber")),
                        "name": f"{r.get('FirstName', '')} {r.get('LastName', '')}".strip(),
                        "team": str(r.get("TeamName") or "Unknown"),
                        "grid": _to_int(r.get("GridPosition")),
                        "finish": _to_int(r.get("Position")),
                        "dnf": _dnf(r.get("Status")),
                        "points": _to_float(r.get("Points")),
                    }
                )
            if verbose:
                print(f"  loaded {year} R{rnd}: {ev['EventName']}")

    return pd.DataFrame(rows)


def latest_driver_lineup(results):
    """The driver lineup (number/code/name/team) from the most recent race loaded.

    Useful as the entry list for predicting the *next* race before its entry list
    is published.
    """
    if len(results) == 0:
        return results
    latest = results[results["chrono"] == results["chrono"].max()]
    return latest[["driver_number", "code", "name", "team"]].reset_index(drop=True)


def _to_int(value) -> float:
    try:
        import math

        f = float(value)
        return float("nan") if math.isnan(f) else int(f)
    except (TypeError, ValueError):
        return float("nan")


def _to_float(value) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0
