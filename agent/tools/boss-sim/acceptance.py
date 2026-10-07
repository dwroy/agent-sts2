#!/usr/bin/env python3
"""Fail-closed, reproducible B4/B5 release gate. No game knowledge is introduced here."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
import tarfile

EPS = 1e-12
CRITERIA = {"min_fights": 10, "brier_ratio": 1.25, "max_gap": .15, "leak_range": [.7, 1.3], "starts": {"b2": "t1", "b3": "pre"}}
SIM_SOURCES = {"agent/src/sim/boss-sim.ts", "agent/src/reflex/rollout.ts", "agent/src/reflex/rollout-live.ts"}
# Keep the scheduler's complete executable/validation scope, including dispatch sources.
SOURCE_PATHS = ["agent/src", "agent/tools", "agent/tests", "agent/package*.json", "agent/tsconfig*.json",
                "agent/vitest*", "learner/*.ts", "learner/*.py", "learner/tasks", "ops/*.sh", "ops/*.py",
                "ops/codex", "ops/tests", "eval/*.py", "eval/*.ts", "eval/cost-config.json", "knowledge/builders"]


def distance(value, low, high):
    return max(low - value, value - high, 0)


def number(value):
    if type(value) not in (int, float) or not math.isfinite(value):
        raise ValueError("missing/non-finite metric")
    return value


def evaluate(before, after, character, boss, mode, isolation):
    reasons, improved = [], []
    try:
        if before.get("character") != character or after.get("character") != character:
            raise ValueError("foreign character")
        if before.get("criteria") != CRITERIA or after.get("criteria") != CRITERIA:
            raise ValueError("trust criteria changed or missing")
        if not before.get("split", {}).get("val") or before["split"] != after.get("split"):
            raise ValueError("before/after must replay the same frozen tune and validation sets")
        if (not before.get("source", {}).get("dataset_sha256")
                or before["source"]["dataset_sha256"] != after.get("source", {}).get("dataset_sha256")
                or not before["source"].get("sources_sha256")
                or before["source"]["sources_sha256"] != after["source"].get("sources_sha256")):
            raise ValueError("before/after data provenance mismatch")
        if not isolation.get("passed") or not isolation.get("base") or not isolation.get("head") or not isolation.get("output_sha256"):
            raise ValueError("live solver/5-turn byte isolation unproven")
        for start in ("t1", "pre"):
            old, new = before["overall"][start], after["overall"][start]
            if number(old["n"]) <= 0 or old["n"] != new["n"]:
                raise ValueError("overall validation coverage mismatch")
            if number(new["brier"]) > number(old["brier"]) + .005 + EPS:
                reasons.append(f"overall {start} Brier worsened by >0.005")
            a, b = before["bosses"][boss][start], after["bosses"][boss][start]
            if number(a["n"]) <= 0 or a["n"] != b["n"] or number(a.get("leak_turns")) <= 0 or a["leak_turns"] != b.get("leak_turns"):
                raise ValueError("boss validation/leak coverage mismatch")
            values = (("brier", number(a["brier"]), number(b["brier"]), number(new["brier"]) * 1.25),
                      ("gap", abs(number(a["mean_pred"]) - number(a["actual_win"])),
                       abs(number(b["mean_pred"]) - number(b["actual_win"])), .15),
                      ("leak", distance(number(a["leak_ratio"]), .7, 1.3), distance(number(b["leak_ratio"]), .7, 1.3), 0))
            if a["actual_win"] != b["actual_win"]:
                raise ValueError("actual outcomes changed")
            for name, previous, candidate, limit in values:
                if candidate > previous + EPS:
                    reasons.append(f"{start} {name} worsened")
                excess, remaining = max(0, previous - limit), max(0, candidate - limit)
                # Near = at least 20% less excess AND within 10% of the fixed standard.
                margin = .03 if name == "leak" else limit * .10
                if candidate < previous - EPS and (candidate <= limit + EPS or
                        excess > EPS and remaining <= excess * .8 + EPS and remaining <= margin + EPS):
                    improved.append(f"{start}:{name}")
            if mode == "b5":
                failures = (b["n"] < 10 or b["brier"] > number(new["brier"]) * 1.25 + EPS
                            or abs(b["mean_pred"] - b["actual_win"]) > .15 + EPS or not .7 - EPS <= b["leak_ratio"] <= 1.3 + EPS)
                if start == "t1" and (failures or boss in after.get("low_trust_b2", {}) or boss not in after.get("trusted_b2", [])):
                    reasons.append("B5 has not met original B2 trust admission")
        if not improved:
            reasons.append("no bias entered/approached its fixed standard")
        if mode not in ("b4", "b5"):
            raise ValueError("unknown mode")
    except (KeyError, TypeError, ValueError) as error:
        reasons.append(str(error))
    return {"accepted": not reasons, "reasons": reasons, "improved": improved,
            "near_rule": "excess reduced >=20% and remaining excess <=10% of fixed limit (leak <=0.03)",
            "isolation": isolation}


def git(root, *args):
    return subprocess.check_output(["git", "-C", str(root), *args], text=True).strip()


def verify_dispatch(evidence, before, character, boss, mode, base):
    if (base != evidence.get("dispatch_base") or
            any(evidence.get(k) != value for k, value in (("character", character), ("boss", boss), ("mode", mode)))):
        raise ValueError("baseline/character/boss/mode differs from dispatch evidence")
    old, extended = evidence.get("split"), before.get("split")
    if (not isinstance(old, dict) or not isinstance(extended, dict) or not old.get("tune") or not old.get("val")
            or old["tune"] != extended.get("tune") or old.get("cutoff") != extended.get("cutoff")
            or not set(old["val"]) <= set(extended.get("val") or [])):
        raise ValueError("dispatch tune/cutoff changed, validation dropped, or split evidence missing")


def isolate(root, base, head, scratch):
    """Replay baseline's immutable fixed runner against both committed sources."""
    root, scratch = Path(root).resolve(), Path(scratch).resolve()
    scratch.mkdir(parents=True, exist_ok=True)
    base, head = git(root, "rev-parse", base + "^{commit}"), git(root, "rev-parse", head + "^{commit}")
    changed = git(root, "diff", "--name-only", base, head, "--", *SOURCE_PATHS).splitlines()
    added_tests = set(git(root, "diff", "--name-only", "--diff-filter=A", base, head, "--", "agent/tests").splitlines()) if any(p.startswith("agent/tests/") for p in changed) else set()
    protected = sorted(set(changed) - SIM_SOURCES - added_tests)
    if protected:
        return {"passed": False, "base": base, "head": head, "protected_changes": protected}
    if git(root, "status", "--porcelain", "--", *SOURCE_PATHS) or git(root, "diff", "--name-only", head, "HEAD", "--", *SOURCE_PATHS):
        raise ValueError("candidate source must remain committed and unchanged")
    def snapshot(commit):
        target = scratch / ("source-" + commit)
        if not target.exists():
            target.mkdir()
            archive = scratch / (commit + ".tar")
            with archive.open("wb") as out:
                subprocess.run(["git", "-C", str(root), "archive", commit, "agent/src", "agent/tests/boss-sim-fixture.ts",
                                "agent/tools/boss-sim/isolation.ts", "agent/package.json"], stdout=out, check=True)
            with tarfile.open(archive) as tar:
                tar.extractall(target, filter="data")
            (target / "agent/node_modules").symlink_to(root / "agent/node_modules")
        return target
    baseline, candidate_source = snapshot(base), snapshot(head)
    outputs = []
    for name, candidate in (("before", baseline), ("after", candidate_source)):
        out_path = scratch / (name + ".isolation.json")
        with out_path.open("wb") as handle:
            subprocess.run(["nice", "-n", "19", "node", "--import", "tsx", str(baseline / "agent/tools/boss-sim/isolation.ts"),
                            str(candidate), str(baseline)], cwd=baseline / "agent", stdout=handle, check=True)
        outputs.append(out_path.read_bytes())
    return {"passed": outputs[0] == outputs[1] and len(outputs[0]) > 100, "base": base, "head": head,
            "output_sha256": hashlib.sha256(outputs[0]).hexdigest(), "candidate_sha256": hashlib.sha256(outputs[1]).hexdigest(),
            "shared_changes": changed, "runner": str(baseline / "agent/tools/boss-sim/isolation.ts"),
            "outputs": [str(scratch / (name + ".isolation.json")) for name in ("before", "after")]}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    for name in ("before", "after", "character", "boss", "mode", "base", "head", "scratch", "out", "evidence"):
        p.add_argument("--" + name, required=True)
    p.add_argument("--root", default=str(Path(__file__).resolve().parents[3]))
    args = p.parse_args()
    try:
        evidence = json.loads(Path(args.evidence).read_text())
        base = git(args.root, "rev-parse", args.base + "^{commit}")
        verify_dispatch(evidence, json.loads(Path(args.before).read_text()), args.character, args.boss, args.mode, base)
        isolation = isolate(args.root, args.base, args.head, args.scratch)
        result = evaluate(json.loads(Path(args.before).read_text()), json.loads(Path(args.after).read_text()),
                          args.character, args.boss, args.mode, isolation)
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        result = {"accepted": False, "reasons": [str(error)]}
    result.update({"character": args.character, "boss": args.boss, "mode": args.mode,
                   "inputs": {name: {"path": str(Path(path).resolve()), "sha256": hashlib.sha256(Path(path).read_bytes()).hexdigest()}
                              for name, path in (("before", args.before), ("after", args.after)) if Path(path).is_file()}})
    Path(args.out).write_text(json.dumps(result, ensure_ascii=False, indent=1) + "\n")
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result["accepted"] else 1


if __name__ == "__main__":
    sys.exit(main())
