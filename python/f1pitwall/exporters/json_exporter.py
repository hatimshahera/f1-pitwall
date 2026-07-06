"""Serialize pydantic models to the public-data directory.

Every writer validates via the pydantic model (which mirrors the shared schema)
before writing, so we never emit data that the dashboard would reject.
"""

from __future__ import annotations

import json
from pathlib import Path

from f1pitwall.models import NextRace, Replay, SeasonIndex, SeasonRace
from f1pitwall.util import slugify


def _dump(model: Replay | SeasonIndex | NextRace, *, compact: bool = False) -> str:
    """Serialize a model to JSON.

    Replays are large frame arrays, so they're written compactly (no indent);
    the small index/next-race files stay pretty-printed for human readability.
    """
    data = model.model_dump(by_alias=True)
    if compact:
        return json.dumps(data, separators=(",", ":"), ensure_ascii=False)
    return json.dumps(data, indent=2, ensure_ascii=False)


def _write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text + "\n", encoding="utf-8")


def write_replay(replay: Replay, public_data_dir: Path, *, update_latest: bool = True) -> Path:
    """Write a race replay to races/<slug>.json and optionally latest-replay.json."""
    slug = slugify(replay.meta.race_name)
    text = _dump(replay, compact=True)

    race_path = public_data_dir / "races" / f"{slug}.json"
    _write(race_path, text)

    if update_latest:
        _write(public_data_dir / "latest-replay.json", text)

    return race_path


def write_season_index(index: SeasonIndex, public_data_dir: Path) -> Path:
    path = public_data_dir / "season-index.json"
    _write(path, _dump(index))
    return path


def write_next_race(next_race: NextRace, public_data_dir: Path) -> Path:
    path = public_data_dir / "next-race.json"
    _write(path, _dump(next_race))
    return path


def upsert_season_race(
    index: SeasonIndex,
    *,
    round_number: int,
    race_name: str,
    session: str,
    date: str | None,
    has_replay: bool,
) -> SeasonIndex:
    """Return a copy of the index with the given race added/updated (by round)."""
    slug = slugify(race_name)
    entry = SeasonRace(
        round=round_number,
        race_name=race_name,
        slug=slug,
        session=session,  # type: ignore[arg-type]
        has_replay=has_replay,
        date=date,
    )
    races = [r for r in index.races if r.round != round_number]
    races.append(entry)
    races.sort(key=lambda r: r.round)
    return index.model_copy(update={"races": races})
