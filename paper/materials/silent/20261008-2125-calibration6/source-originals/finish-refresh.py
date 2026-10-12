"""Complete the frozen refresh after all new offline replay rows have finished."""
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(ROOT / "agent/tools/boss-sim"))
spec = importlib.util.spec_from_file_location("refresh", ROOT / "agent/tools/boss-sim/refresh-silent.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


previous = json.loads((HERE / "previous-trust.json").read_text())
parent = ROOT / "experiments/boss-sim/silent" / previous["refresh"]["artifact"]
fights = rows(HERE / "dataset/fights.jsonl")
new_keys = set(json.loads((HERE / "new-keys.json").read_text()))
new_results = rows(HERE / "new-results/results-0.jsonl")
assert len(new_results) == 40
assert {(r["key"], r["start"]) for r in new_results} == {(key, start) for key in new_keys for start in ("t1", "pre")}
provenance = json.loads((HERE / "provenance.json").read_text())
assert module.model_fingerprint(ROOT, Path("/home/dw/Projects/agent-sts2/data/game-data.json")) == provenance["input_files"]
combined = rows(parent / "results.jsonl") + new_results
assert len(combined) == len(fights) * 2
(HERE / "results.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in combined))
args = ["--scratch", str(HERE), "--logs", "/home/dw/Projects/agent-sts2/logs", "--db", "/home/dw/Projects/agent-sts2/data/logdb",
        "--game-data", "/home/dw/Projects/agent-sts2/data/game-data.json", "--previous", str(HERE / "previous-trust.json"),
        "--dataset", str(HERE / "dataset"), "--results", str(HERE / "results.jsonl"), "--provenance", str(HERE / "provenance.json"),
        "--out", str(ROOT / "knowledge/characters/silent/boss-trust.json"), "--report", str(ROOT / "paper/materials/silent/boss-sim-calibration.md")]
assert module.main(args) == 0
trust_path = ROOT / "knowledge/characters/silent/boss-trust.json"
report_path = ROOT / "paper/materials/silent/boss-sim-calibration.md"
trust_bytes, report_bytes = trust_path.read_bytes(), report_path.read_bytes()
assert module.main(args) == 0
assert trust_path.read_bytes() == trust_bytes and report_path.read_bytes() == report_bytes
trust = json.loads(trust_bytes)
assert trust["split"]["tune"] == previous["split"]["tune"]
assert trust["split"]["cutoff_ts"] == previous["split"]["cutoff_ts"]
assert trust["split"]["val"][:len(previous["split"]["val"])] == previous["split"]["val"]
assert len(trust["split"]["val"]) == 154
for start in ("t1", "pre"):
    assert trust["overall"][start]["platt"] == previous["overall"][start]["platt"]
    assert trust["selection"][start] == previous["selection"][start]
    assert trust["overall"][start]["n"] == 154
threshold_args = [v for v in args]
threshold_args[threshold_args.index("--previous") + 1] = str(trust_path)
from unittest.mock import patch
with patch.object(module.subprocess, "run") as child:
    assert module.main(threshold_args) == 0
    child.assert_not_called()
assert trust_path.read_bytes() == trust_bytes and report_path.read_bytes() == report_bytes
(HERE / "idempotency-audit.json").write_text(json.dumps({
    "identical_complete_skip": True, "threshold_skip": True, "no_subprocess_on_threshold_skip": True,
    "fixed_tune_keys": 107, "validation": 154, "unchanged_parameters_and_selection": True,
    "trust_sha256": hashlib.sha256(trust_bytes).hexdigest(), "original_report_sha256": hashlib.sha256(report_bytes).hexdigest(),
}, indent=2) + "\n")
(HERE / "artifact.txt").write_text(trust["refresh"]["artifact"] + "\n")
print(json.dumps({"artifact": trust["refresh"]["artifact"], "overall": {s: {k: trust["overall"][s][k] for k in ("n", "brier", "platt")} for s in ("t1", "pre")},
                  "trusted_b2": trust["trusted_b2"], "trusted_b3": trust["trusted_b3"], "errors": trust["errors"]}, ensure_ascii=False))
