"""Publication lock covers completed-file replacement only, never computation."""
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path
import tempfile
import time


@contextmanager
def publication(ops_root=None):
    root = ops_root or os.environ.get('STS2_REFRESH_OPS_ROOT')
    if not root:
        yield
        return
    directory = Path(root) / 'ops'
    directory.mkdir(parents=True, exist_ok=True)
    waiting = time.monotonic()
    acquired = held = None
    try:
        with (directory / 'live-merge.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            acquired = time.monotonic()
            try:
                yield
            finally:
                held = time.monotonic() - acquired
                fcntl.flock(lock, fcntl.LOCK_UN)
    finally:
        if held is not None:
            with (directory / 'refresh-publication-timing.jsonl').open('a') as out:
                out.write(json.dumps(dict(schema='knowledge-publication-v1', pid=os.getpid(),
                    step=os.environ.get('STS2_REFRESH_STEP'),
                    cycle=os.environ.get('STS2_REFRESH_CYCLE'),
                    at=datetime.now(timezone.utc).isoformat(), wait_seconds=acquired-waiting,
                    held_seconds=held)) + '\n')


def replace(temporary, target):
    with publication():
        os.replace(temporary, target)


def write_text(target, text):
    path = Path(target)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix='.refresh-', dir=path.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf8') as out:
            out.write(text)
            out.flush()
            os.fchmod(out.fileno(), 0o644)
        replace(temporary, target)
    finally:
        Path(temporary).unlink(missing_ok=True)
