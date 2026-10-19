"""One observed, inclusive run-end boundary for frozen history and metrics."""
from datetime import datetime, timezone
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'learner'))
from evidence_identity import run_identity


def timestamp(value):
    if not isinstance(value, str):
        raise ValueError('missing observed timestamp')
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        raise ValueError('timestamp has no timezone')
    return parsed.astimezone(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')


def after_run_end(row, ended):
    return timestamp(row['ts']) > timestamp(ended)
