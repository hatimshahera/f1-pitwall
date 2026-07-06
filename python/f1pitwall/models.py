"""Pydantic models mirroring the shared TypeScript/Zod data contract.

Field names are snake_case in Python but serialize to camelCase JSON (via the
alias generator), so the output validates against ``@f1pitwall/shared``. Dump
with ``model_dump(by_alias=True)``.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

SessionCode = Literal["R", "Q", "S", "SQ", "FP1", "FP2", "FP3"]
CarStatus = Literal["RUNNING", "IN_PIT", "RETIRED", "FINISHED", "UNKNOWN"]
TyreCompound = Literal["SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET", "UNKNOWN"]


class _Model(BaseModel):
    """Base with camelCase aliasing and populate-by-name for ergonomic construction."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Bounds(_Model):
    min_x: float
    max_x: float
    min_y: float
    max_y: float


class ReplayMeta(_Model):
    schema_version: str
    year: int
    race_name: str
    session: SessionCode
    frame_rate: float
    generated_at: str
    data_sources: list[str]
    disclaimer: str


class Track(_Model):
    name: str
    points: list[tuple[float, float]]
    bounds: Bounds
    rotation: float | None = None
    width: float


class ReplayDriver(_Model):
    driver_number: str
    code: str
    name: str
    team: str
    color: str


class Timeline(_Model):
    t: list[float]
    lap: list[int]


# A change-segment: [start_frame_index, value]. The value applies until the next.
StatusSegment = tuple[int, CarStatus]
CompoundSegment = tuple[int, TyreCompound | None]


class CarTrack(_Model):
    """One driver's whole race as parallel arrays indexed by frame."""

    driver_number: str
    x: list[float]
    y: list[float]
    position: list[int]
    gap_to_leader: list[float | None] | None = None
    interval: list[float | None] | None = None
    status_segments: list[StatusSegment]
    compound_segments: list[CompoundSegment]


class Replay(_Model):
    meta: ReplayMeta
    track: Track
    drivers: list[ReplayDriver]
    timeline: Timeline
    cars: list[CarTrack]


class SeasonRace(_Model):
    round: int
    race_name: str
    slug: str
    session: SessionCode
    has_replay: bool
    date: str | None = None


class SeasonIndex(_Model):
    year: int
    generated_at: str
    races: list[SeasonRace]


class RaceSession(_Model):
    name: str
    starts_at: str | None = None


class NextRace(_Model):
    year: int
    race_name: str
    round: int
    circuit: str
    country: str | None = None
    date: str | None = None
    sessions: list[RaceSession] = Field(default_factory=list)
    generated_at: str
