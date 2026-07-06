import numpy as np

from f1pitwall.replay.frames import (
    CarSamples,
    assemble_frames,
    compute_bounds,
    make_timeline,
    resample,
    resample_polyline,
)


def test_make_timeline_length_and_spacing():
    tl = make_timeline(1.0, 10.0)
    assert tl[0] == 0.0
    assert len(tl) == 11  # 0.0 .. 1.0 inclusive at 0.1 spacing
    assert np.allclose(np.diff(tl), 0.1)


def test_resample_holds_endpoints_outside_range():
    src_t = np.array([0.0, 10.0])
    src_v = np.array([0.0, 100.0])
    tl = np.array([-5.0, 5.0, 15.0])
    out = resample(src_t, src_v, tl)
    assert out[0] == 0.0  # clamped low
    assert out[1] == 50.0  # midpoint
    assert out[2] == 100.0  # clamped high


def test_resample_polyline_downsamples():
    xs = np.arange(1000, dtype=float)
    ys = np.arange(1000, dtype=float)
    pts = resample_polyline(xs, ys, 100)
    assert len(pts) == 100
    assert pts[0] == (0.0, 0.0)


def test_compute_bounds():
    b = compute_bounds([(0.0, 5.0), (10.0, -3.0), (4.0, 8.0)])
    assert (b.min_x, b.max_x, b.min_y, b.max_y) == (0.0, 10.0, -3.0, 8.0)


def test_assemble_frames_orders_by_progress_and_marks_retirement():
    tl = make_timeline(1.0, 10.0)
    n = len(tl)
    fast = CarSamples(
        driver_number="1",
        xs=np.zeros(n),
        ys=np.zeros(n),
        progress=np.linspace(0, 100, n),
        laps=np.ones(n, dtype=int),
        compounds=["SOFT"] * n,
    )
    slow = CarSamples(
        driver_number="2",
        xs=np.zeros(n),
        ys=np.zeros(n),
        progress=np.linspace(0, 50, n),
        laps=np.ones(n, dtype=int),
        compounds=["MEDIUM"] * n,
        retire_index=3,
    )
    frames = assemble_frames(tl, [fast, slow])
    assert len(frames) == n

    # Early frame: both running, faster car leads.
    early = frames[1]
    positions = {c.driver_number: c.position for c in early.cars}
    assert positions["1"] == 1
    assert positions["2"] == 2

    # After retirement index, car 2 is marked RETIRED and ranked last.
    late = frames[-1]
    retired = [c for c in late.cars if c.driver_number == "2"][0]
    assert retired.status == "RETIRED"
    leader = [c for c in late.cars if c.position == 1][0]
    assert leader.driver_number == "1"
    assert leader.status == "FINISHED"
