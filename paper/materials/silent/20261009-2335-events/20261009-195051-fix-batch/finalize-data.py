import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

p = Path(__file__).resolve().parent
root = p.parents[2]
evidence = json.loads((p / "dispatch-evidence.json").read_text())
head = (p / "source-commit.txt").read_text().strip()
assert len(head) == 40
for path, sha in json.loads((p / "baseline-tool-fingerprints.json").read_text())["files"].items():
    assert hashlib.sha256((root / path).read_bytes()).hexdigest() == sha, path
for name in ("before-parallel", "after-parallel"):
    receipt = json.loads((p / (name + ".receipt.json")).read_text())
    assert receipt["maximumProcesses"] <= 4 and receipt["resourceError"] is None
    assert all(r["code"] == 0 and r["message"] == {"complete": True} for r in receipt["result"])

steps = []
def call(name, args):
    with (p / (name + ".log")).open("wb") as log:
        result = subprocess.run(args, cwd=root, stdout=log, stderr=subprocess.STDOUT)
    (p / (name + ".rc")).write_text(str(result.returncode) + "\n")
    steps.append({"name": name, "exit": result.returncode, "args": [str(a) for a in args]})
    (p / "data-finalization-steps.json").write_text(json.dumps(steps, ensure_ascii=False, indent=1) + "\n")
    return result.returncode

for side in ("before", "after"):
    assert call(side + "-assemble", [sys.executable, p / "assemble.py", side]) == 0
    rows = [json.loads(line) for line in (p / (side + "-results.jsonl")).read_text().splitlines()]
    assert len(rows) == 654
    assert all(r["sim"]["samples"] == 200 and len(r["sim"]["outcomes"]) == 200 for r in rows if r.get("sim"))
    assert call(side + "-trust", [sys.executable, root / "agent/tools/boss-sim/trust.py", "--character", "silent",
        "--results", p / (side + "-results.jsonl"), "--fights", p / "dataset/fights.jsonl", "--split", p / "split.json",
        "--turns", p / "dataset/turns.jsonl", "--provenance", p / (side + "-provenance.json"), "--out", p / (side + "-trust.json")]) == 0
    for split in ("tune", "val"):
        for start in ("t1", "pre"):
            name = f"{side}-queen-{split}-{start}"
            assert call(name, [sys.executable, root / "agent/tools/boss-sim/per-turn.py", "--results", p / (side + "-results.jsonl"),
                "--split", p / "split.json", "--set", split, "--start", start, "--enc", "QUEEN", "--max-turn", "16",
                "--turns", p / "dataset/turns.jsonl", "--json", p / (name + ".json")]) == 0

before = json.loads((p / "before-trust.json").read_text())
after = json.loads((p / "after-trust.json").read_text())
assert before["split"] == after["split"]
for name in ("dataset_sha256", "sources_sha256", "turns_sha256", "split_sha256"):
    assert before["source"][name] == after["source"][name]
coverage = {}
for start in ("t1", "pre"):
    old = json.loads((p / f"before-queen-val-{start}.json").read_text())
    new = json.loads((p / f"after-queen-val-{start}.json").read_text())
    coverage[start] = {"observed_turns_file_identical": before["source"]["turns_sha256"] == after["source"]["turns_sha256"],
        "before_joint_log_sim_survivor_counts": [[r["turn"], r["n"]] for r in old],
        "after_joint_log_sim_survivor_counts": [[r["turn"], r["n"]] for r in new],
        "before_leak_turns": before["bosses"]["QUEEN"][start]["leak_turns"],
        "after_leak_turns": after["bosses"]["QUEEN"][start]["leak_turns"]}
(p / "paired-coverage.json").write_text(json.dumps(coverage, ensure_ascii=False, indent=1) + "\n")

os.environ["PATH"] = "/home/dw/.local/node/bin:" + os.environ["PATH"]
gate_rc = call("acceptance", [sys.executable, p / "acceptance-baseline.py", "--character", "silent", "--boss", "QUEEN", "--mode", "b4",
    "--before", p / "before-trust.json", "--after", p / "after-trust.json", "--base", evidence["dispatch_base"], "--head", head,
    "--evidence", "/home/dw/Projects/agent-sts2/ops/codex-ops/learner/20261009-195051-fix-batch.boss-evidence.json",
    "--root", root, "--scratch", p / "acceptance", "--out", p / "acceptance.json"])
gate = json.loads((p / "acceptance.json").read_text())
assert gate_rc == (0 if gate["accepted"] else 1)
print(json.dumps({"data_steps_completed": True, "acceptance_exit": gate_rc, "accepted": gate["accepted"], "reasons": gate["reasons"]}, ensure_ascii=False))
