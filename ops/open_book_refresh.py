#!/usr/bin/env python3
"""Bounded missing-reference refresh on the existing ops cadence; no model or game calls."""
import argparse
import fcntl
import importlib.util
import json
from pathlib import Path
import os


def playing():
    # Conservative: any current user's STS2 play launcher defers the network job.
    for directory in Path("/proc").glob("[0-9]*"):
        try:
            if directory.stat().st_uid != os.getuid():
                continue
            argv = (directory / "cmdline").read_bytes().split(b"\0")
            if b"play" in argv and any(b"src/index.ts" in arg or b"dist/src/index.js" in arg for arg in argv):
                return True
        except (OSError, ValueError):
            continue
    return False


def tick(root):
    directory = root / "data/external/open-book"
    pending = directory / "pending"
    if not pending.exists():
        return {"status": "empty"}
    directory.mkdir(parents=True, exist_ok=True)
    with (directory / "refresh.lock").open("a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return {"status": "busy"}
        requests = []
        receipts = directory / "receipts"
        receipts.mkdir(exist_ok=True)
        for path in sorted(pending.glob("*.json"))[:256]:
            if not (receipts / path.name).exists():
                requests.append(path)
        if not requests:
            return {"status": "empty-or-already-checked"}
        if playing():
            return {"status": "deferred-playing", "pending": len(requests)}
        spec = importlib.util.spec_from_file_location("open_book_builder", root / "knowledge/builders/build-open-book.py")
        builder = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(builder)
        # Only the reviewed version/source allowlist. A new source/version requires a new license review.
        entries = builder.build(root, network=True)
        indexed = {(row["kind"], row["id"]) for row in entries}
        found = 0
        for path in requests:
            row = json.loads(path.read_text())
            present = (row.get("kind"), row.get("id")) in indexed
            found += present
            builder.save(receipts / path.name, {**row, "status": "available" if present else "unresolved-in-reviewed-snapshot",
                                                "source_revision": builder.REV, "retry": "新来源或新版本经许可核验后重新处理；未找到不能算已补齐"})
        return {"status": "checked", "checked": len(requests), "available": found, "unresolved": len(requests) - found}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("command", choices=["tick"])
    args = parser.parse_args()
    print(json.dumps(tick(args.root.resolve())))
