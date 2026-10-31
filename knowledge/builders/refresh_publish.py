"""Publication lock covers completed-file replacement only, never computation."""
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import tempfile
import time
import sys


def validate_stats_projection():
    """Reject a forged staging flag before the original pipeline starts any step."""
    staging = os.environ.get('STS2_STATS_STAGING_ROOT')
    if staging:
        stage = Path(staging)
        if (stage.resolve() != stage or stage != Path(__file__).resolve().parents[2] or stage.name != 'root'
                or stage.parent.parent.name != 'stats-refresh' or stage.parent.parent.parent.name != 'data'):
            raise ValueError('stats staging capability does not match executing producer root')
        raw = (stage.parent / 'projection.json').read_bytes()
        body = json.loads(raw)
        if (hashlib.sha256(raw).hexdigest() != os.environ.get('STS2_STATS_STAGING_CONTRACT_SHA256')
                or body.get('schema') != 'stats-projection-v1' or body.get('root') != str(stage)
                or body.get('original_root') != str(stage.parents[3])):
            raise ValueError('stats projection contract differs')
        fd = int(os.environ['STS2_STATS_LOCK_FD'])
        inherited, original = os.fstat(fd), (stage.parents[3] / 'ops/knowledge-refresh.lock').stat()
        if (inherited.st_dev, inherited.st_ino) != (original.st_dev, original.st_ino):
            raise ValueError('stats worker lock descriptor differs')
        return True
    return False


@contextmanager
def publication(ops_root=None, target=None):
    # A copied fixed pipeline may publish only inside its own ignored projection.
    if validate_stats_projection():
        yield
        return
    source_root = Path(__file__).resolve().parents[2]
    runtime_root = Path(ops_root or os.environ.get('STS2_REFRESH_OPS_ROOT') or os.environ.get('CODEX_OPS_ROOT') or source_root)
    control = Path(os.environ.get('CODEX_OPS_DIR') or runtime_root / 'ops/codex-ops') / 'stats-runtime.json'
    if target is not None and Path(target).absolute().is_relative_to(source_root / 'knowledge') and os.path.lexists(control):
        sys.path.insert(0, str(runtime_root / 'ops'))
        from stats_runtime import capture
        from stats_refresh import resource_key
        if resource_key(str(Path(target).absolute().relative_to(source_root / 'knowledge'))) and capture(runtime_root).get('enabled'):
            raise ValueError('A output must use the captured S1 refresh driver; preserve original source data')
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
    with publication(target=target):
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
