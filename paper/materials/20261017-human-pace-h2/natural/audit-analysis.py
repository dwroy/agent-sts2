"""Independent admission, source, record-join and denominator checks for the final report."""
from pathlib import Path
from collections import Counter
from datetime import datetime
import gzip
import hashlib
import json
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
MIN_CODE = "3910f41b9c3784a70362f63aad5f0994794c68b7"


def read(name):
    with gzip.open(HERE / "inputs-final" / (name + ".jsonl.gz"), "rt") as f:
        return [json.loads(line) for line in f]


def blob(commit, path):
    return subprocess.check_output(["git", "show", f"{commit}:{path}"], cwd=ROOT)


def main():
    result = json.loads((HERE / "analysis-final.json").read_bytes())
    terminal = json.loads((HERE / "three-terminal-event.json").read_bytes())
    configs, ends, decisions, sidecars = (read(n) for n in ("run-config", "runs", "decisions", "human-pace-shadow"))
    assert len(result["runs"]) == 3
    assert set(result["runs"]) == set(terminal["admitted"])
    checks = []
    production_files = subprocess.check_output(["git", "diff-tree", "--no-commit-id", "--name-only", "-r",
                                                "8165321296eeab263f8cfe0cc7dd08b30245bad2"], cwd=ROOT, text=True).splitlines()
    production_files = [p for p in production_files if p.startswith("agent/src/")]
    for run in terminal["admitted"]:
        cs = [c for c in configs if c["run_id"] == run]
        es = [e for e in ends if e["run_id"] == run]
        ds = [d for d in decisions if d["run_id"] == run]
        assert len(cs) == 1 and len(es) == 1
        c, e = cs[0], es[0]
        assert c["floor"] == 1 and c["restart"] is False and c["character"] == "SILENT"
        assert c["human_pace_h2"]["mode"] == "shadow" and c["human_pace_h2"]["delivered"] is False
        assert c["human_pace"]["budgets"]["boss"] == 60000 and c["human_pace"]["budgets"]["retry"] == 10000
        code = c["code"]["commit"]
        assert subprocess.run(["git", "merge-base", "--is-ancestor", MIN_CODE, code], cwd=ROOT).returncode == 0
        assert len(ds) == e["decisions"], (run, len(ds), e["decisions"])
        changes = subprocess.check_output(["git", "diff", "--name-only", MIN_CODE, code, "--", "agent/src", "knowledge/characters/silent"], cwd=ROOT, text=True).splitlines()
        sources = [{"path": p, "minimum_code_sha256": hashlib.sha256(blob(MIN_CODE, p)).hexdigest(),
                    "startup_code_sha256": hashlib.sha256(blob(code, p)).hexdigest()} for p in production_files]
        rows = [s for s in sidecars if s["run_id"] == run]
        assert all(r.get("delivered") is False and r.get("actual_decision_unchanged") is True for r in rows)
        actual_cards = [d for d in ds if d.get("label") == "reward/card"]
        projections = [r for r in result["card_questions"] if r["run_id"] == run]
        assert len(actual_cards) == len(projections)
        assert len({r["decision_id"] for r in projections}) == len(projections), "decision IDs duplicated"
        actual_by_id = {d["decision_id"]: d for d in actual_cards}
        for row in projections:
            d = actual_by_id[row["decision_id"]]
            assert row["sources"]["decision"] == d["_source"]
            if row["jev_success"]:
                assert row["jev_fallback"] is None and row["jev_success_choice"] is not None
            if row["module_first_basis"] != "raw_Act2_weighted_win_S_excluded":
                assert row["numerical_module_first"] is None and row["difficulty"] == "comparison_unknown"
        checks.append({"run": run, "startup_code": code, "startup": c["ts"], "end": e["ended"],
                       "whole_natural_start_and_terminal": True, "decision_count": len(ds),
                       "card_decisions": len(actual_cards), "sidecar_rows": len(rows),
                       "dirty_startup_paths": c["code"].get("dirty_files"), "H2_production_blobs": sources,
                       "descendant_changes_agent_or_Silent_knowledge": changes,
                       "scope": "startup commit and logged flags, not an atomic proof of all dirty knowledge inputs"})
    all_cards = result["card_questions"]
    n = len(all_cards)
    agreement = result["agreements"]["all"]
    assert agreement["questions"] == n
    assert sum(x["questions"] for x in result["agreements"]["by_difficulty"].values()) == n
    assert sum(x["questions"] for x in result["agreements"]["by_brain_take_skip"].values()) == n
    assert not result["duplicate_card_sidecars"], "duplicate observations must be resolved rather than counted twice"
    provenance = json.loads((HERE / "inputs-final/provenance-verification.json").read_bytes())
    assert provenance["all_original_row_SHA_verified"] and provenance["all_projections_recomputed_equal"]
    original_plans = read("run-plans")
    accepted_plans = [p for p in original_plans if isinstance(p.get("plan"), dict)]
    assert result["plans"]["original_accepted_plan_updates"] == len(accepted_plans)
    assert len(result["plans"]["failed_or_unaccepted_plan_rows"]) + len(accepted_plans) == len(original_plans)
    request_ids = [r["jev_meta"].get("request_id") for r in result["card_questions"] if r["jev_meta"]]
    assert len(request_ids) == len(set(request_ids)) and all(request_ids), "Jev request identity not unique"
    output = {"at": datetime.now().astimezone().isoformat(), "all_mechanical_checks_passed": True,
              "admission": checks, "partition_denominators": n,
              "missing_sidecar_not_hidden": result["missing_card_sidecar"],
              "claims_not_established": ["three independent card-choice outcomes per question", "causal win benefit", "third-act or joint probability calibrated", "all dirty runtime inputs covered by exact host test"],
              "analysis_sha256": hashlib.sha256((HERE / "analysis-final.json").read_bytes()).hexdigest()}
    (HERE / "audit-final.json").write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"checks": True, "runs": terminal["admitted"], "cards": n}))


if __name__ == "__main__":
    main()
