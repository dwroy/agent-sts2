#!/usr/bin/env python3
"""Capacity admission for the existing tick and natural run boundaries; no model or poller."""
import argparse
import fcntl
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time

GiB = 1 << 30
WINDOW = 24 * 3600


def configuration(root):
    root = Path(root).resolve()
    candidates = [root / "ops/disk-policy.json"]
    # A role runtime can consume the original repository's common capacity policy.
    if (root / ".git").is_file():
        try:
            common = subprocess.check_output(["git", "-C", str(root), "rev-parse",
                "--path-format=absolute", "--git-common-dir"], text=True, stderr=subprocess.DEVNULL).strip()
            if isinstance(common, str) and Path(common).is_absolute():
                candidates.insert(0, Path(common).parent / "ops/disk-policy.json")
        except (OSError, subprocess.SubprocessError):
            pass
    for path in candidates:
        if path.is_file() and not path.is_symlink():
            value = json.loads(path.read_text())
            if value != {"schema": "disk-admission-policy-v1", "authorization": value.get("authorization"),
                         "unit": "GiB", "hold_new_jobs_at_or_below": 100, "hold_next_run_at_or_below": 60,
                         "regent_minimum_available": 200, "regent_buffer_hours": 48}:
                raise ValueError("capacity policy differs from the approved thresholds")
            return path, value
    return None, None


def rate(samples):
    """Reclamation cannot subtract observed consumption and manufacture a zero rate."""
    if len(samples) < 2:
        return None
    consumed = elapsed = 0
    for before, after in zip(samples, samples[1:]):
        delta = after["at"] - before["at"]
        if delta <= 0:
            return None
        consumed += max(0, before["available_bytes"] - after["available_bytes"])
        elapsed += delta
    return consumed * 3600 / elapsed if elapsed else None


def evaluate(available, samples):
    per_hour = rate(samples)
    buffer = None if per_hour is None else (available / per_hour if per_hour > 0 else None)
    regent = available >= 200 * GiB and per_hour is not None and (per_hour == 0 or buffer >= 48)
    return {"available_bytes": available, "available_GiB": available / GiB,
            "new_jobs_allowed": available > 100 * GiB,
            "new_channel_allowed": available > 100 * GiB,
            "next_run_allowed": available > 60 * GiB,
            "regent_resume_allowed": regent,
            "recent_consumption_bytes_per_hour": per_hour,
            "buffer_hours": buffer, "zero_observed_consumption": per_hour == 0,
            "rate_known": per_hour is not None,
            "rate_method": "positive interval consumption / elapsed time, original tick samples in last24h; reclamation never subtracts consumption"}


def read(path):
    if not path.exists():
        return {"samples": []}
    value = json.loads(path.read_text())
    if value.get("schema") != "disk-admission-state-v1" or not isinstance(value.get("samples"), list):
        raise ValueError("capacity state is invalid; retain original")
    for item in value["samples"]:
        if (not isinstance(item, dict) or type(item.get("at")) not in (int, float) or not math.isfinite(item["at"])
                or type(item.get("available_bytes")) is not int or item["available_bytes"] < 0):
            raise ValueError("capacity sample is invalid; retain original")
    return value


def atomic(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix=".capacity-", dir=path.parent)
    try:
        with os.fdopen(fd, "w") as handle:
            json.dump(value, handle, ensure_ascii=False, indent=2, allow_nan=False)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(name, path)
    finally:
        Path(name).unlink(missing_ok=True)


def snapshot(root, directory, *, record=False, now=None, available=None):
    policy_path, _ = configuration(root)
    if policy_path is None:
        # Historical isolated fixtures/old lanes have no policy yet. Regent admission is
        # still denied; publication installs the policy and code together in real lanes.
        return {"configured": False, "new_jobs_allowed": True, "new_channel_allowed": True,
                "next_run_allowed": True, "regent_resume_allowed": False, "reason": "legacy_instance_without_policy"}
    root = Path(root).resolve()
    folder = policy_path.parent / "codex-ops/disk-capacity"
    folder.mkdir(parents=True, exist_ok=True)
    current = time.time() if now is None else now
    free = shutil.disk_usage(root).free if available is None else available
    if type(free) is not int or free < 0 or type(current) not in (int, float) or not math.isfinite(current):
        raise ValueError("invalid capacity measurement; retain original state")
    with (folder / "state.lock").open("a") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        statefile = folder / "current.json"
        state = read(statefile)
        samples = [item for item in state["samples"] if item["at"] >= current - WINDOW]
        if samples and current < samples[-1]["at"]:
            raise ValueError("capacity clock moved backwards; retain original samples")
        if record:
            if samples and current <= samples[-1]["at"]:
                raise ValueError("capacity clock did not advance; retain original samples")
            samples.append({"at": current, "available_bytes": free})
        result = {"schema": "disk-admission-state-v1", "configured": True, "at": current,
                  "root": str(root), "policy": str(policy_path), "samples": samples, **evaluate(free, samples)}
        previous = state.get("severity")
        result["severity"] = "next_run_hold" if not result["next_run_allowed"] else "new_work_hold" if not result["new_jobs_allowed"] else "ok"
        result["attention_transition"] = result["severity"] != "ok" and result["severity"] != previous
        if record:
            # Keep original measurements; the bounded current view may age old samples out.
            with (folder / "measurements.jsonl").open("a") as history:
                history.write(json.dumps({"schema": "capacity-sample-v1", "at": current,
                    "available_bytes": free, "root": str(root)}, ensure_ascii=False) + "\n")
                history.flush()
                os.fsync(history.fileno())
            atomic(statefile, result)
        return result


def jobs_allowed(root, directory):
    return snapshot(root, directory)["new_jobs_allowed"]


def character(root):
    root = Path(root)
    if (root / "ops/regent-lane.json").is_file():
        return "regent"
    path = root / "ops/instance-binding.json"
    if path.is_file():
        return str(json.loads(path.read_text()).get("character", "")).lower()
    return os.environ.get("CHARACTER", "silent").lower()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("root", type=Path)
    p.add_argument("--state-dir", type=Path)
    p.add_argument("--kind", choices=("tick", "jobs", "channel", "next-run", "regent"), required=True)
    args = p.parse_args()
    result = snapshot(args.root, args.state_dir, record=args.kind == "tick")
    kind = args.kind
    if kind == "channel" and character(args.root) == "regent":
        kind = "regent"
    allowed = kind == "tick" or result[{"jobs": "new_jobs_allowed", "channel": "new_channel_allowed",
                                       "next-run": "next_run_allowed", "regent": "regent_resume_allowed"}[kind]]
    print(json.dumps({**result, "kind": kind, "allowed": allowed}, ensure_ascii=False))
    return 0 if allowed else 75


if __name__ == "__main__":
    raise SystemExit(main())
