"""Podium prediction pipeline interface + Phase 1 stub.

Phase 3 will implement each stage. Documenting the intended design here keeps the
architecture visible and the CLI honest.

Planned stages
--------------
1. load: gather historical results, qualifying, grid, constructor standings, DNFs.
2. feature_engineering: qualifying position, recent finishing form, constructor
   strength score, average position change per circuit, DNF rate, grid position.
3. train: a baseline model (GradientBoosting / RandomForest / LogisticRegression)
   predicting finishing rank or podium probability.
4. evaluate: RANK-AWARE metrics (top-3 hit rate, Spearman rank correlation) with
   RACE-WISE cross-validation — never a random row split, which leaks laps.
5. predict: produce a ranked list with podium probabilities for the next race.
6. export: write predictions/next.json marked ``experimental: true``.
"""

from __future__ import annotations


class PredictionNotReady(NotImplementedError):
    """Raised while the prediction pipeline is still a Phase 1 scaffold."""


def predict_podium(year: int, race: str) -> None:
    """Placeholder for the Phase 3 podium predictor."""
    raise PredictionNotReady(
        "The podium prediction pipeline is an experimental Phase 3 feature and is not "
        "implemented yet. The scaffold and planned design live in "
        "f1pitwall/predictions/. See docs/architecture.md."
    )
