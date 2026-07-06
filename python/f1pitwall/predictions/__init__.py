"""Experimental podium-prediction scaffolding.

The **modelling** is intentionally left to you, in
``notebooks/podium_predictions.ipynb``. This package only provides the plumbing
around it:

- :func:`data.load_results` — FastF1 race results as a tidy DataFrame.
- :func:`data.latest_driver_lineup` — entry list for the next race.
- :func:`export.build_predictions` / :func:`export.export_predictions` — turn your
  model's podium probabilities into the validated ``predictions/next.json`` that
  the dashboard renders.
"""

from f1pitwall.predictions.data import latest_driver_lineup, load_results
from f1pitwall.predictions.export import build_predictions, export_predictions

__all__ = [
    "load_results",
    "latest_driver_lineup",
    "build_predictions",
    "export_predictions",
]
