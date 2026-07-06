"""Runtime configuration, resolved from environment variables with sane defaults."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _repo_root() -> Path:
    # python/f1pitwall/config.py -> repo root is two parents up from the package.
    return Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Config:
    """Where the pipeline reads caches and writes generated JSON."""

    public_data_dir: Path
    fastf1_cache_dir: Path

    @staticmethod
    def load() -> Config:
        root = _repo_root()
        public_data = Path(os.environ.get("PUBLIC_DATA_DIR", root / "public-data"))
        cache = Path(os.environ.get("FASTF1_CACHE_DIR", root / "python" / ".fastf1-cache"))
        return Config(public_data_dir=public_data.resolve(), fastf1_cache_dir=cache.resolve())
