from f1pitwall.models import Predictions
from f1pitwall.predictions import build_predictions

SAMPLE = [
    {
        "driver_number": "1",
        "code": "VER",
        "name": "Max V",
        "team": "Red Bull",
        "podium_probability": 0.40,
    },
    {
        "driver_number": "16",
        "code": "LEC",
        "name": "Charles L",
        "team": "Ferrari",
        "podium_probability": 0.82,
    },
    {
        "driver_number": "4",
        "code": "NOR",
        "name": "Lando N",
        "team": "McLaren",
        "podium_probability": 0.61,
    },
]


def test_build_predictions_ranks_by_probability():
    p = build_predictions(
        year=2026, race_name="Belgian Grand Prix", round=10, model="unit-test", drivers=SAMPLE
    )
    assert isinstance(p, Predictions)
    assert p.meta.experimental is True
    ranks = {d.code: d.predicted_rank for d in p.drivers}
    assert ranks == {"LEC": 1, "NOR": 2, "VER": 3}


def test_predictions_dump_is_camelcase_and_experimental():
    p = build_predictions(
        year=2026, race_name="Belgian Grand Prix", round=10, model="unit-test", drivers=SAMPLE
    )
    dumped = p.model_dump(by_alias=True)
    assert dumped["meta"]["schemaVersion"] == "2.0"
    assert dumped["meta"]["experimental"] is True
    assert "predictedRank" in dumped["drivers"][0]
    assert "podiumProbability" in dumped["drivers"][0]
