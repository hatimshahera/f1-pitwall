"""Data source adapters. FastF1 is imported lazily so the synthetic generator
and tests work without the (heavy) data dependencies installed."""

from f1pitwall.data_sources.fastf1_source import (
    FastF1Unavailable,
    build_replay_from_session,
    load_race_session,
    resolve_schedule,
)

__all__ = [
    "FastF1Unavailable",
    "build_replay_from_session",
    "load_race_session",
    "resolve_schedule",
]
