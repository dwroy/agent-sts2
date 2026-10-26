"""Durable idempotent projection of SQLite completion events into the existing ops queue."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import time


def sync_dir(path):
    fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def enqueue_once(directory, kind, text, request):
    if kind != "knowledge-done" or not isinstance(request, str) or not request.startswith("complete:"):
        raise ValueError("invalid knowledge event identity")
    directory = Path(directory)
    ledger = directory / "knowledge-completion-events"
    queue, delivered = directory / "queue", directory / "delivered"
    for path in (ledger, queue):
        path.mkdir(parents=True, exist_ok=True)
    key = hashlib.sha256(request.encode()).hexdigest()
    with (ledger / "events.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        record = ledger / (key + ".json")
        if record.exists():
            saved = json.loads(record.read_text())
            if saved["request"] != request or saved["kind"] != kind or saved["text"] != text.strip() + "\n":
                raise ValueError("completion event identity reused")
        else:
            saved = {"request": request, "kind": kind, "name": f"{time.time_ns()}-{kind}.md", "text": text.strip() + "\n"}
            stage = ledger / (key + ".prepare")
            with stage.open("w") as handle:
                json.dump(saved, handle, ensure_ascii=False)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(stage, record)
            sync_dir(ledger)
        name = saved["name"]
        # The consumer atomically renames queue/name to delivered/name. Keep the source forever.
        if (delivered / name).exists() or (queue / name).exists():
            return name
        source = ledger / (key + ".md")
        if not source.exists():
            stage = ledger / (key + ".body-prepare")
            with stage.open("w") as handle:
                handle.write(saved["text"])
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(stage, source)
            sync_dir(ledger)
        elif source.read_text() != saved["text"]:
            raise ValueError("completion event source changed")
        # Rename by the consumer preserves the second hard link, closing the queue→delivered race.
        if source.stat().st_nlink > 1:
            return name
        os.link(source, queue / name)
        sync_dir(queue)
        return name
