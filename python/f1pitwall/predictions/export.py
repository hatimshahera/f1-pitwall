"""Turn your model's output into the experimental predictions JSON contract.

This is the "export the other stuff" layer: once you have a podium probability
per driver (from your own model in the notebook), these helpers build the
validated ``Predictions`` document and write it to
``public-data/predictions/next.json``, where the dashboard picks it up.
"""

from __future__ import annotations

from collections.abc import Iterable
from pathlib import Path
from typing import Any

from f1pitwall import DISCLAIMER, SCHEMA_VERSION
from f1pitwall.config import Config
from f1pitwall.exporters import write_predictions
from f1pitwall.models import PredictedDriver, Predictions, PredictionsMeta
from f1pitwall.util import now_iso

PREDICTION_DISCLAIMER = (
    "Experimental. F1 outcomes are noisy; this is a portfolio/learning project, "
    "not betting advice. " + DISCLAIMER
)


def build_predictions(
    *,
    year: int,
    race_name: str,
    round: int,
    model: str,
    drivers: Iterable[dict[str, Any]],
    session: str = "R",
) -> Predictions:
    """Build a validated ``Predictions`` model from per-driver podium probabilities.

    Each item in ``drivers`` needs: ``driver_number``, ``code``, ``name``,
    ``team``, ``podium_probability`` (0..1). Drivers are sorted by probability and
    assigned ``predicted_rank`` 1..N.
    """
    ordered = sorted(drivers, key=lambda d: d["podium_probability"], reverse=True)
    predicted = [
        PredictedDriver(
            driver_number=str(d["driver_number"]),
            code=str(d["code"]),
            name=str(d["name"]),
            team=str(d["team"]),
            predicted_rank=rank,
            podium_probability=float(d["podium_probability"]),
        )
        for rank, d in enumerate(ordered, start=1)
    ]
    meta = PredictionsMeta(
        schema_version=SCHEMA_VERSION,
        year=year,
        race_name=race_name,
        round=round,
        session=session,  # type: ignore[arg-type]
        model=model,
        generated_at=now_iso(),
        experimental=True,
        disclaimer=PREDICTION_DISCLAIMER,
    )
    return Predictions(meta=meta, drivers=predicted)


def export_predictions(predictions: Predictions, public_data_dir: Path | None = None) -> Path:
    """Write predictions to public-data/predictions/next.json (dashboard picks it up)."""
    target = public_data_dir or Config.load().public_data_dir
    return write_predictions(predictions, target)
