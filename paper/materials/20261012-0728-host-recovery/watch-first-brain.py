"""Observe one new accepted brain answer using file events, without reading credentials."""
import ctypes
import hashlib
import json
import os
from pathlib import Path
import select
import subprocess
import sys
import time

root = Path(__file__).resolve().parents[3]
out = Path(__file__).resolve().parent
baseline = json.loads((out / "launch-baseline.json").read_text())
home = Path(baseline["brain_home"])
names = ["codex-calls.jsonl", "brain.jsonl", "run-config.jsonl"]
positions = dict(baseline["log_offsets"])
buffers = {name: b"" for name in names}
traces, brains, configs, metadata = {}, {}, {}, {}
libc = ctypes.CDLL(None, use_errno=True)
fd = libc.inotify_init1(os.O_NONBLOCK | os.O_CLOEXEC)
if fd < 0 or libc.inotify_add_watch(fd, os.fsencode(root / "logs"), 0x2 | 0x8 | 0x80 | 0x100) < 0:
    raise OSError(ctypes.get_errno(), "inotify unavailable")


def session_meta(thread):
    if thread in metadata:
        return metadata[thread]
    for path in (home / "sessions").rglob(f"*{thread}*.jsonl"):
        try:
            with path.open("rb") as handle:
                for line in handle:
                    row = json.loads(line)
                    if row.get("type") != "session_meta":
                        continue
                    payload = row["payload"]
                    if payload.get("id") == thread:
                        value = {"path": str(path), "line_digest": hashlib.sha256(line).hexdigest(),
                                 **{key: payload.get(key) for key in ["id", "timestamp", "cwd", "model_provider"]}}
                        metadata[thread] = value
                        return value
        except (FileNotFoundError, json.JSONDecodeError):
            continue
    return None


def read_appends():
    for name in names:
        path = root / "logs" / name
        if not path.exists():
            continue
        with path.open("rb") as handle:
            handle.seek(positions[name])
            raw = handle.read()
            positions[name] = handle.tell()
        data = buffers[name] + raw
        complete = data.split(b"\n")
        buffers[name] = complete.pop()
        for line in complete:
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            run = row.get("run_id")
            if not run or run == "N1ZEBMHZM4KC":
                continue
            digest = hashlib.sha256(line + b"\n").hexdigest()
            if name == "run-config.jsonl":
                configs[run] = (row, digest)
            elif name == "codex-calls.jsonl" and row.get("outcome") == "answered":
                traces[(run, row.get("question_id"))] = (row, digest)
                if row.get("thread_id"):
                    session_meta(row["thread_id"])
            elif name == "brain.jsonl" and row.get("engine") == "codex" and row.get("accepted") is True:
                brains[(run, row.get("question_id"))] = (row, digest)


deadline = time.monotonic() + 300
while True:
    read_appends()
    for key, (brain, brain_digest) in brains.items():
        if key not in traces or key[0] not in configs:
            continue
        trace, trace_digest = traces[key]
        meta = session_meta(trace.get("thread_id", ""))
        if not meta or trace.get("answer_chars", 0) <= 0 or trace.get("usage", {}).get("outputTokens", 0) <= 0:
            continue
        config, config_digest = configs[key[0]]
        at = subprocess.check_output(["date", "+%Y-%m-%d %H:%M:%S %Z"], text=True).strip()
        result = {"at": at, "status": "verified_actual_consumption", "brain_home": str(home),
                  "run_id": key[0], "question_id": key[1], "session_meta": meta,
                  "trace": {k: trace.get(k) for k in ["ts", "mode", "label", "model", "effort", "outcome", "thread_id", "turn_id", "answer_chars", "deltas", "usage"]},
                  "trace_line_digest": trace_digest, "brain_row_digest": brain_digest,
                  "brain_accepted": True,
                  "answer_digest": hashlib.sha256(json.dumps(brain.get("answer"), ensure_ascii=False, sort_keys=True).encode()).hexdigest(),
                  "run_config": {k: config.get(k) for k in ["ts", "run_id", "character", "ascension", "target_ascension", "target_ascension_mode", "process", "code", "codex_check"]},
                  "run_config_line_digest": config_digest, "credentials_read": False,
                  "observation": "inotify file events; real accepted answer and usage linked to target-home native thread"}
        (out / "brain-consumption-receipt.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
        print(json.dumps({"status": result["status"], "run_id": key[0], "thread": trace["thread_id"], "model": trace["model"]}), flush=True)
        sys.exit(0)
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        print("No accepted answer with native target-home receipt within observer window", flush=True)
        sys.exit(2)
    select.select([fd], [], [], remaining)
    try:
        os.read(fd, 262144)
    except BlockingIOError:
        pass
