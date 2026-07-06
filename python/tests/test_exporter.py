import json

from f1pitwall.exporters import write_replay, write_season_index
from f1pitwall.exporters.json_exporter import upsert_season_race
from f1pitwall.models import SeasonIndex
from f1pitwall.replay.synthetic import build_synthetic_replay
from f1pitwall.util import now_iso, slugify


def test_write_replay_creates_race_and_latest(tmp_path):
    replay = build_synthetic_replay(duration_sec=5.0)
    path = write_replay(replay, tmp_path, update_latest=True)

    assert path.exists()
    assert (tmp_path / "latest-replay.json").exists()

    data = json.loads(path.read_text())
    assert data["meta"]["schemaVersion"] == "1.0"
    assert data["meta"]["raceName"] == replay.meta.race_name
    # Latest mirrors the race file exactly.
    assert data == json.loads((tmp_path / "latest-replay.json").read_text())


def test_slugify():
    assert slugify("British Grand Prix") == "british-grand-prix"
    assert slugify("  São Paulo GP!! ") == "s-o-paulo-gp"


def test_upsert_season_race_is_sorted_and_deduped():
    index = SeasonIndex(year=2026, generated_at=now_iso(), races=[])
    index = upsert_season_race(
        index, round_number=3, race_name="Race C", session="R", date=None, has_replay=True
    )
    index = upsert_season_race(
        index, round_number=1, race_name="Race A", session="R", date=None, has_replay=False
    )
    # Update round 1 again (dedupe by round).
    index = upsert_season_race(
        index, round_number=1, race_name="Race A", session="R", date=None, has_replay=True
    )

    assert [r.round for r in index.races] == [1, 3]
    assert index.races[0].has_replay is True


def test_write_season_index(tmp_path):
    index = SeasonIndex(year=2026, generated_at=now_iso(), races=[])
    path = write_season_index(index, tmp_path)
    assert path.exists()
    assert json.loads(path.read_text())["year"] == 2026
