"""f1pitwall — F1 data processing and prediction pipeline.

Turns completed F1 sessions (via FastF1) into web-friendly replay JSON that the
dashboard and reusable widget consume. See the CLI in ``f1pitwall.cli``.
"""

__version__ = "0.1.0"

# 2.0 — structure-of-arrays replay encoding (see docs/data-contract.md).
SCHEMA_VERSION = "2.0"

DISCLAIMER = (
    "This is an unofficial educational/portfolio project. It is not affiliated with "
    "Formula 1, FIA, Formula One Management, teams, drivers, or official broadcasters. "
    "Data comes from public/unofficial sources and may be incomplete or delayed."
)
