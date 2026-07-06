from f1pitwall.models import Replay
from f1pitwall.replay.synthetic import GRID, build_synthetic_replay


def test_synthetic_replay_is_valid_and_deterministic():
    a = build_synthetic_replay(frame_rate=10.0, duration_sec=20.0)
    b = build_synthetic_replay(frame_rate=10.0, duration_sec=20.0)

    # Round-trips through the pydantic contract.
    assert isinstance(a, Replay)
    assert len(a.drivers) == len(GRID)
    assert len(a.frames) == 201  # 0..20s inclusive at 10fps

    # Deterministic given the same seed/params (ignoring the generated timestamp).
    assert a.model_dump(exclude={"meta": {"generated_at"}}) == b.model_dump(
        exclude={"meta": {"generated_at"}}
    )


def test_every_frame_has_unique_positions():
    replay = build_synthetic_replay(frame_rate=10.0, duration_sec=15.0)
    for frame in replay.frames:
        positions = [car.position for car in frame.cars]
        assert len(positions) == len(set(positions)), "positions must be unique within a frame"
        assert sorted(positions) == list(range(1, len(positions) + 1))


def test_track_points_within_bounds():
    replay = build_synthetic_replay(duration_sec=10.0)
    b = replay.track.bounds
    for x, y in replay.track.points:
        assert b.min_x <= x <= b.max_x
        assert b.min_y <= y <= b.max_y


def test_serialized_json_uses_camel_case_aliases():
    replay = build_synthetic_replay(duration_sec=5.0)
    dumped = replay.model_dump(by_alias=True)
    assert "schemaVersion" in dumped["meta"]
    assert "raceName" in dumped["meta"]
    assert "driverNumber" in dumped["frames"][0]["cars"][0]
    assert "gapToLeader" in dumped["frames"][0]["cars"][0]
