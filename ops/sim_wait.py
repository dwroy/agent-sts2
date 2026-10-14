#!/usr/bin/env python3
"""Recognize fresh, advancing simulation work in this live lane only."""
import argparse
import datetime as dt
import json
from pathlib import Path
import time

from process_scope import belongs


def live_wait(logs, root, live, now=None, alive=None):
    try:
        row = json.loads((Path(logs) / "sim-wait.json").read_text())
        if not isinstance(row, dict) or row.get("active") is not True:
            return None
        stamp = dt.datetime.fromisoformat(row["ts"].replace("Z", "+00:00")).timestamp()
        progress = dt.datetime.fromisoformat(row["progress_ts"].replace("Z", "+00:00")).timestamp()
        current = time.time() if now is None else now
        done, previous, requested = (row[k] for k in ("samples_done", "previous_samples", "requested"))
        if not all(type(n) is int for n in (done, previous, requested)):
            return None
        if not (0 <= previous < done <= requested and -5 <= current - stamp < 180 and -5 <= current - progress < 180):
            return None
        if not row.get("run") or not row.get("label") or type(row.get("pid")) is not int:
            return None
        running = alive(row["pid"]) if alive else belongs(row["pid"], root, live, kind="play")
        return row if running else None
    except (OSError, ValueError, KeyError, TypeError):
        return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("logs")
    parser.add_argument("--root", required=True)
    parser.add_argument("--live", required=True)
    args = parser.parse_args()
    row = live_wait(args.logs, args.root, args.live)
    if not row:
        return 1
    print(f"OK (simulation advancing: run {row['run']} F{row.get('floor')} {row['label']}: {row['samples_done']}/{row['requested']}; {row['ts']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
