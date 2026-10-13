"""Preserve generated tables while sharing unchanged, immutable archive bytes."""
import errno
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import tempfile
import datetime as dt

from disk_capacity import BLOCK_BYTES, require_capacity


def file_hash(path):
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            value.update(chunk)
    return value.hexdigest()


def allocated(size):
    return ((size + BLOCK_BYTES - 1) // BLOCK_BYTES) * BLOCK_BYTES


def preserve_snapshot(data):
    data = Path(data)
    if not data.is_dir() or not any(path.is_file() for path in data.iterdir()):
        return None
    require_capacity(data, 0)
    history = data / "history"
    history.mkdir(exist_ok=True)
    with (history / ".preserve.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        files = sorted(path for path in data.iterdir() if path.is_file())
        previous = sorted((path for path in history.iterdir()
                           if path.is_dir() and not path.is_symlink() and not path.name.startswith(".")), reverse=True)
        previous = previous[0] if previous else None
        entries = []
        for path in files:
            info = path.stat()
            digest = file_hash(path)
            old = previous / path.name if previous else None
            reused = bool(old and old.is_file() and not old.is_symlink()
                          and old.stat().st_size == info.st_size and file_hash(old) == digest)
            entries.append((path, old if reused else None, dict(size=info.st_size, sha256=digest,
                            mtime_ns=info.st_mtime_ns, mode=stat.S_IMODE(info.st_mode))))
        rewrite_bytes = sum(allocated(entry[2]["size"]) for entry in entries)
        remaining_bytes = BLOCK_BYTES + sum(allocated(meta["size"]) for path, old, meta in entries if old is None)
        require_capacity(data, remaining_bytes + rewrite_bytes, len(files) * 2 + 4)
        stage = Path(tempfile.mkdtemp(prefix=".snapshot-", dir=history))
        try:
            metadata = {}
            for path, old, meta in entries:
                saved = stage / path.name
                if old is not None:
                    try:
                        os.link(old, saved)
                    except OSError as error:
                        if error.errno not in (errno.EXDEV, errno.EPERM, errno.EOPNOTSUPP):
                            raise
                        require_capacity(data, remaining_bytes + rewrite_bytes + allocated(meta["size"]), len(files) * 2 + 4)
                        shutil.copy2(path, saved)
                else:
                    shutil.copy2(path, saved)
                    remaining_bytes -= allocated(meta["size"])
                if file_hash(saved) != meta["sha256"]:
                    raise OSError("snapshot input changed while being preserved")
                metadata[path.name] = meta
            # Hard links preserve bytes; source metadata belongs to this snapshot, not the first copy.
            (stage / ".snapshot.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n")
            target = history / dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
            if target.exists():
                raise FileExistsError(target)
            stage.rename(target)
            return str(target)
        finally:
            # Only this invocation's unpublished, reconstructible copies are disposable.
            if stage.exists():
                shutil.rmtree(stage)
