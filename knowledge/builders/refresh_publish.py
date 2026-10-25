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
    if os.environ.get('STS2_FIXED_DATA_LEASE'):
        # The admitted fixed producer is enclosed by refresh_step's durable
        # preimage journal and data lock. Never take the unrelated source lock.
        directory = Path(os.environ['STS2_FIXED_DATA_LEASE'])
        lease_fd = int(os.environ['STS2_FIXED_DATA_LOCK_FD'])
        inherited = os.fstat(lease_fd)
        original = (directory / 'data-publication.lock').stat()
        if (inherited.st_dev, inherited.st_ino) != (original.st_dev, original.st_ino):
            raise ValueError('fixed-data lock descriptor differs')
        journal = Path(os.environ['STS2_FIXED_DATA_JOURNAL'])
        if journal.parent != directory or journal.is_symlink():
            raise ValueError('foreign fixed-data publication journal')
        row = json.loads(journal.read_text())
        if row.get('schema') != 'fixed-data-journal-v1' or row.get('status') != 'preparing':
            raise ValueError('missing original fixed-data publication lease')
        yield
        return
    root = ops_root or os.environ.get('STS2_REFRESH_OPS_ROOT')
    if not root:
        yield
        return
    control = Path(os.environ.get('CODEX_OPS_DIR') or Path(root) / 'ops/codex-ops') / 'learning-runtime.json'
    if os.environ.get('STS2_REFRESH_STEP') == 'catalog' and (control.exists() or os.environ.get('STS2_REFRESH_SELECTION_FILE')):
        import sys
        sys.path.insert(0, str(Path(root) / 'ops'))
        from learning_runtime_data import launch_selection
        selected = launch_selection(root)
        if selected.get('enabled') and selected.get('refresh'):
            directory = Path(selected['directory'])
            directory.mkdir(parents=True, exist_ok=True)
            with (directory / 'data-view.lock').open('a') as lock:
                fcntl.flock(lock, fcntl.LOCK_EX)
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
