#!/usr/bin/env python3
"""Select an opt-in run profile from completed runs, never from controller starts."""
import argparse
import json
from pathlib import Path
import re
import shlex


def rows(path):
    if not path.exists():
        return
    with path.open() as handle:
        for line in handle:
            if line.strip():
                yield json.loads(line)  # Corrupt journals must hold admission, not skip an arm.


def select(schedule, configs, outcomes):
    if (set(schedule) != {"trial_id", "arms", "total"}
            or not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", str(schedule["trial_id"]))
            or schedule["arms"] != [{"engine": "codex", "effort": "high"}, {"engine": "codex", "effort": "xhigh"}]
            or type(schedule["total"]) is not int or schedule["total"] != 20):
        raise ValueError("#31 requires 20 alternating Codex high/xhigh runs; DeepSeek awaits #32")
    done = {r["run_id"] for r in outcomes if isinstance(r.get("victory"), bool) and r.get("ended")}
    profiles = {}
    latest = None
    for c in configs:
        latest = c
        p = c.get("brain", {}).get("run_profile")
        if p and p.get("trial_id") == schedule["trial_id"]:
            rid = c["run_id"]
            if rid in profiles and profiles[rid] != p:
                raise ValueError("mixed run profile; admission held")
            profiles[rid] = p
    ordered = sorted(profiles.items(), key=lambda item: item[1].get("sequence", -1))
    for i, (rid, p) in enumerate(ordered):
        expected = dict(schedule["arms"][i % 2], trial_id=schedule["trial_id"], sequence=i)
        if p != expected or i >= schedule["total"]:
            raise ValueError("non-contiguous/duplicate trial allocation")
        if rid not in done and i != len(ordered) - 1:
            raise ValueError("unfinished earlier trial run")
    if latest and latest["run_id"] not in done:
        p = latest.get("brain", {}).get("run_profile")
        if not ordered or ordered[-1][0] != latest["run_id"] or p != ordered[-1][1]:
            raise ValueError("active run predates this trial; enroll only at a new-run boundary")
        return p
    if ordered and ordered[-1][0] not in done:
        raise ValueError("latest config does not own unfinished trial run")
    i = len(ordered)
    if i >= schedule["total"]:
        raise ValueError("trial complete; ops must select the next policy explicitly")
    return dict(schedule["arms"][i % 2], trial_id=schedule["trial_id"], sequence=i)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--schedule", type=Path, required=True)
    parser.add_argument("--logs", type=Path, required=True)
    args = parser.parse_args()
    try:
        profile = select(json.loads(args.schedule.read_text()), rows(args.logs / "run-config.jsonl"), rows(args.logs / "runs.jsonl"))
    except (OSError, ValueError, KeyError, TypeError):
        parser.exit(78, "brain trial admission held: invalid journal, active foreign run, or finished allocation; inspect before retry\n")
    # Only this validated JSON is evaluated by run.sh; no arbitrary schedule fields reach the shell.
    print("export BRAIN_RUN_CONFIG=" + shlex.quote(json.dumps(profile, separators=(",", ":"))))
    print("export BRAIN_CODEX_EFFORT=" + profile["effort"])
    print("export BRAIN_CODEX_MODE=session")


if __name__ == "__main__":
    main()
