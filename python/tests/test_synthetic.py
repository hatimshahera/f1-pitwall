from f1pitwall.models import Replay
from f1pitwall.replay.synthetic import GRID, build_synthetic_replay


def test_synthetic_replay_is_valid_and_deterministic():
    a = build_synthetic_replay(frame_rate=10.0, duration_sec=20.0)
    b = build_synthetic_replay(frame_rate=10.0, duration_sec=20.0)

    assert isinstance(a, Replay)
    assert len(a.drivers) == len(GRID)
    assert len(a.cars) == len(GRID)
    assert len(a.timeline.t) == 201  # 0..20s inclusive at 10fps
    # Every parallel array matches the timeline length.
    assert all(len(c.x) == 201 and len(c.position) == 201 for c in a.cars)

    # Deterministic given the same seed/params (ignoring the generated timestamp).
    assert a.model_dump(exclude={"meta": {"generated_at"}}) == b.model_dump(
        exclude={"meta": {"generated_at"}}
    )


def test_every_frame_has_unique_positions():
    replay = build_synthetic_replay(frame_rate=10.0, duration_sec=15.0)
    n = len(replay.timeline.t)
    for fi in range(n):
        positions = [car.position[fi] for car in replay.cars]
        assert sorted(positions) == list(range(1, len(positions) + 1))


def test_track_has_width_and_within_bounds():
    replay = build_synthetic_replay(duration_sec=10.0)
    assert replay.track.width > 0
    b = replay.track.bounds
    for x, y in replay.track.points:
        assert b.min_x <= x <= b.max_x
        assert b.min_y <= y <= b.max_y


def test_serialized_json_uses_camel_case_soa_layout():
    replay = build_synthetic_replay(duration_sec=5.0)
    dumped = replay.model_dump(by_alias=True)
    assert "schemaVersion" in dumped["meta"]
    assert "timeline" in dumped and "cars" in dumped
    assert "driverNumber" in dumped["cars"][0]
    assert "statusSegments" in dumped["cars"][0]
    assert "compoundSegments" in dumped["cars"][0]
    assert dumped["track"]["width"] > 0
