"""Experimental podium-prediction pipeline (Phase 3).

The module layout intentionally mirrors a real ML pipeline so Phase 3 slots in
without a rewrite:

    load      -> feature_engineering -> train -> evaluate -> predict -> export

For Phase 1 only the interfaces and a documented NotImplemented stub exist, so
the CLI command is present and honest about being unimplemented.
"""

from f1pitwall.predictions.pipeline import PredictionNotReady, predict_podium

__all__ = ["predict_podium", "PredictionNotReady"]
