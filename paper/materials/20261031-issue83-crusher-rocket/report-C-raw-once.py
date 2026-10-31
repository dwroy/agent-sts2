#!/usr/bin/env python3
"""Describe the one preregistered result without fitting or asserting missing source gates."""
import copy
import hashlib
import json
from pathlib import Path
import sys

TREE = Path(__file__).resolve().parents[3]
MATERIAL = TREE / "paper/materials/20261031-issue83-crusher-rocket"
OUT = TREE / ".artifacts/issue83/crusher-rocket/C-raw-once"
FORMAL = TREE / ".artifacts/issue83/crusher-rocket/formal-model"
sys.path.insert(0, str(TREE / "agent/tools/boss-sim"))
from calib import block, LEAK_TURNS
from silent_calibration import mapped
from trust import judge
from acceptance import EPS, distance


def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def coverage(records, turns):
    # Match calib.leak's exact availability predicate, retaining row/turn identity.
    found = []
    for r in records:
        for k in LEAK_TURNS:
            actual = turns.get(r["key"], {}).get(k)
            per_turn = r.get("sim", {}).get("perTurn", [])
            if (not actual or len(per_turn) < k or actual[5] is None
                    or actual[3] is None or per_turn[k - 1][0] == 0):
                continue
            found.append([r["key"], k])
    return sorted(found)


def comparison(before, after, target, turns):
    old = block(before, turns, exact=True)
    new = block(after, turns, exact=True)
    b = [r for r in before if r["key"] in target]
    a = [r for r in after if r["key"] in target]
    bm, am = block(b, turns, exact=True), block(a, turns, exact=True)
    result = {"overall_before": old, "overall_after": new,
              "target_before": bm, "target_after": am,
              "expected_target_keys": len(target),
              "missing_before": sorted(target - {r["key"] for r in b}),
              "missing_after": sorted(target - {r["key"] for r in a}),
              "numerical_failures": [], "improved": []}
    failures = result["numerical_failures"]
    if not old or not new or not bm or not am:
        failures.append("missing_metric_scope")
        return result
    if {r["key"] for r in before} != {r["key"] for r in after}:
        failures.append("overall_success_coverage_changed")
    if {r["key"] for r in a} != target or {r["key"] for r in b} != target:
        failures.append("target_result_coverage_missing_or_changed")
    bc, ac = coverage(b, turns), coverage(a, turns)
    result["leak_coverage"] = {"before_turns": len(bc), "after_turns": len(ac),
        "exact_keys_equal": bc == ac,
        "before_sha256": hashlib.sha256(json.dumps(bc).encode()).hexdigest(),
        "after_sha256": hashlib.sha256(json.dumps(ac).encode()).hexdigest()}
    if not bc or bc != ac:
        failures.append("target_leak_coverage_missing_or_changed")
    if new["brier"] > old["brier"] + .005 + EPS:
        failures.append("overall_Brier_worsened_gt_0.005")
    if bm["actual_win"] != am["actual_win"]:
        failures.append("actual_outcomes_changed")
    result["original_B2_B3_failed_after"] = [f[0] for f in judge(am, new["brier"], exact=True)]
    if am["leak"].get("enemy_ratio") is None:
        result["original_B2_B3_failed_after"].append("leak_missing")
    br, ar = bm["leak"].get("enemy_ratio"), am["leak"].get("enemy_ratio")
    metrics = [("brier", bm["brier"], am["brier"], new["brier"] * 1.25),
        ("gap", abs(bm["mean_pred"] - bm["actual_win"]),
         abs(am["mean_pred"] - am["actual_win"]), .15)]
    if br is None or ar is None:
        failures.append("missing_leak_ratio")
    else:
        metrics.append(("leak", distance(br, .7, 1.3), distance(ar, .7, 1.3), 0))
    for name, previous, candidate, limit in metrics:
        if candidate > previous + EPS:
            failures.append(name + "_worsened")
        excess, remaining = max(0, previous - limit), max(0, candidate - limit)
        margin = .03 if name == "leak" else limit * .1
        if candidate < previous - EPS and (candidate <= limit + EPS or
                excess > EPS and remaining <= excess * .8 + EPS and remaining <= margin + EPS):
            result["improved"].append(name)
    if not result["improved"]:
        failures.append("no_bias_entered_or_approached_fixed_standard")
    result["numerical_only"] = True
    return result


def main():
    # Never inspect partial outcomes: require the coordinator's fixed completion.
    complete = json.loads((OUT / "completed.json").read_text())
    prereg = json.loads((MATERIAL / "C-raw-preregistration.json").read_text())
    assert complete["source_unchanged"] and complete["knowledge_unchanged"]
    for name, ref in prereg["inputs"].items():
        assert sha(TREE / name) == ref["sha256"], "Frozen input drift: " + name
    for stage in complete["stages"]:
        assert stage["exit"] == 0 and sha(Path(stage["output"])) == stage["output_sha256"]
    replacement = [r for stage in complete["stages"] for r in rows(Path(stage["output"]))]
    expected = {(k, s) for k in prereg["target_keys"] for s in ("t1", "pre")}
    assert len(replacement) == len(expected) == 104
    assert {(r["key"], r["start"]) for r in replacement} == expected
    candidate = {(r["key"], r["start"]): r for r in replacement}
    raw = [r for name in (".artifacts/issue83/model-pair/before-first/results-0.jsonl",
                ".artifacts/issue83/crusher-rocket/formal-model/new-val30/results-0.jsonl")
           for r in rows(TREE / name)]
    val = set(prereg["validation_keys"])
    baseline = {(r["key"], r["start"]): r for r in raw if r["key"] in val}
    assert set(baseline) == {(k, s) for k in val for s in ("t1", "pre")}
    for key, r in candidate.items():
        assert r["character"] == "silent" and r["asc"] == 10 and r["enc"] == "CRUSHER+ROCKET"
        assert r["actual"] == baseline[key]["actual"], "Outcome mismatch"
    turns = {r["key"]: {int(t[0]): t for t in r["turns"]}
             for r in rows(FORMAL / "formal-turns.jsonl")}
    models = json.loads((MATERIAL / "approved-first70-calibration.json").read_text())["overall"]
    cohorts = json.loads((FORMAL.parent / "engine-strata-global.json").read_text())["run_cohorts"]
    result = {"schema": "issue83-C-once-numerical-report-v1", "prereg_commit": complete["prereg_commit"],
        "validation_seen": True, "fits_performed": 0, "production_admitted": False,
        "formal_B4_B5": {"accepted": False,
            "reason": "Committed candidate identity and immutable-runner/full engineering receipts must be checked separately; numerical tables do not substitute."},
        "no_auto_enable_even_pass": True, "reports": {}, "completion": complete}
    scopes = {"original332": set(prereg["original_first_val_keys"]),
        "extensions345": set(prereg["later_extensions_keys"]), "all677": val}
    for start in ("t1", "pre"):
        old_raw = [r for (k, s), r in baseline.items() if s == start and r.get("sim")]
        before = mapped(old_raw, models[start]["platt"])
        after = [candidate[(r["key"], start)] if (r["key"], start) in candidate else copy.deepcopy(r)
                 for r in before]
        after = [r for r in after if r.get("sim")]
        result["reports"][start] = {}
        for window, keys in scopes.items():
            result["reports"][start][window] = {}
            for engine in ("codex_a10", "all_a10", "all", "deepseek_a10", "unknown_a10"):
                selected = {k for k in keys if engine == "all" or
                    baseline[(k, start)]["asc"] == 10 and (engine == "all_a10" or
                    cohorts[k.split(":")[0]]["source"] == engine.removesuffix("_a10"))}
                target = selected & set(prereg["target_keys"])
                result["reports"][start][window][engine] = comparison(
                    [r for r in before if r["key"] in selected],
                    [r for r in after if r["key"] in selected], target, turns)
    with (OUT / "numerical-report.json").open("x") as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2);handle.write("\n")
    print(json.dumps({"written": "numerical-report.json", "production_admitted": False}))


if __name__ == "__main__":
    main()
