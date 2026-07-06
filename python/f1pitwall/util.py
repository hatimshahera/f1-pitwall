"""Small shared helpers."""

from __future__ import annotations

import re
from datetime import datetime, timezone


def slugify(name: str) -> str:
    """Turn a race name into a URL-safe slug, e.g. 'British Grand Prix' -> 'british-grand-prix'."""
    slug = name.strip().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


def now_iso() -> str:
    """Current UTC time as an ISO-8601 string with a trailing Z."""
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def format_clock(total_seconds: float) -> str:
    """Format elapsed seconds as HH:MM:SS."""
    s = max(0, int(total_seconds))
    hours, rem = divmod(s, 3600)
    minutes, seconds = divmod(rem, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
