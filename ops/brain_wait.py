#!/usr/bin/env python3
"""Recognize a live Codex wait, and terminal decisions requiring an explicit same-run restart."""
import argparse
import datetime as dt
import json
import os
import time
from pathlib import Path


def read_marker(logs):
    try:
        row = json.loads((Path(logs) / "brain-wait.json").read_text())
        return row if isinstance(row, dict) else {}
    except (OSError, ValueError):
        return {}


def play_alive(pid):
    if not isinstance(pid, int) or pid <= 0:
        return False
    try:
        os.kill(pid, 0)
        command = Path(f"/proc/{pid}/cmdline").read_bytes().replace(b"\0", b" ")
        return b"index.ts play" in command
    except (OSError, ValueError):
        return False


def live_wait(logs, now=None, alive=play_alive):
    row = read_marker(logs)
    if row.get("state") not in ("paused", "heartbeat") or not row.get("question_id"):
        return None
    try:
        stamp = dt.datetime.fromisoformat(row["ts"].replace("Z", "+00:00")).timestamp()
    except (KeyError, TypeError, ValueError):
        return None
    age = (time.time() if now is None else now) - stamp
    return row if -5 <= age <= 45 and alive(row.get("pid")) else None


def hold(logs):
    row = read_marker(logs)
    return row.get("state") in ("fault", "cancelled") and bool(row.get("question_id"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("logs")
    parser.add_argument("--hold", action="store_true")
    args = parser.parse_args()
    if args.hold:
        return 0 if hold(args.logs) else 1
    row = live_wait(args.logs)
    if not row:
        return 1
    print(f"OK (Codex waiting: run {row.get('run_id')}, {row['decision_type']}, question {row['question_id']}; {row['reason']}; heartbeat {row['ts']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
