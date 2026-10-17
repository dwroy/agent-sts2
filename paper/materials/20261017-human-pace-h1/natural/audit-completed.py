"""Audit frozen natural-run identities and emit reproducible tables; no raw-log scan."""
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter
import csv
import gzip
import hashlib
import json

HERE = Path(__file__).resolve().parent
OUT = HERE / "resume-25mf-2pqk"
POST = ["25MFNPAE37R2", "2PQK67ULZY90"]


def ref(p):
    b = p.read_bytes()
    return {"path": str(p.relative_to(HERE)), "bytes": len(b), "sha256": hashlib.sha256(b).hexdigest()}


def stamp(s):
    d = datetime.fromisoformat(s.replace("Z", "+00:00"))
    return d.replace(tzinfo=timezone.utc) if d.tzinfo is None else d


def main():
    analysis = json.loads((OUT / "analysis-final.json").read_bytes())
    evidence, anomalies, selected = [], [], 0
    lane_counts = Counter()
    for inp in analysis["inputs"]:
        directory = HERE / inp
        m = json.loads((directory / "manifest.json").read_bytes())
        v = json.loads((directory / "provenance-verification.json").read_bytes())
        assert v["all_selected_original_ranges_match"]
        assert v["source_manifest_sha256"] == ref(directory / "manifest.json")["sha256"]
        selected += sum(v["counts"].values())
        for f in m["files"]:
            p = HERE / f["path"]
            assert ref(p)["sha256"] == f["sha256"] and p.stat().st_size == f["bytes"]
        evidence.append({"manifest": ref(directory / "manifest.json"), "original_range_verification": ref(directory / "provenance-verification.json"), "counts": v["counts"], "complete_source_bounds": m["sources"], "invalid_original_rows": m["invalid_rows"]})
        with gzip.open(directory / "decisions.jsonl.gz", "rt") as f:
            for line in f:
                d = json.loads(line)
                s = d.get("boss_sim") or {}
                lane = (s.get("completion") or {}).get("lane") or (s.get("adaptive") or {}).get("lane")
                if lane:
                    assert (lane.lower() == "b2") == (d.get("screen") == "COMBAT")
                    lane_counts[lane] += 1
                if d.get("observed_ts"):
                    wall = (stamp(d["ts"]) - stamp(d["observed_ts"])).total_seconds() * 1000
                    proxy = sum((d.get("latency_ms") or {}).get(k, 0) or 0 for k in ("pre", "planner", "plan", "jev", "deepseek"))
                    if abs(wall - proxy) > 1000:
                        assert d.get("label") == "map/route-change"
                        anomalies.append({"run_id": d["run_id"], "label": d["label"], "wall_ms": wall, "logged_current_compute_ms": proxy, "source": d["_source"], "limit": "route carry row retains older observed timestamp; do not substitute ts-observed as current compute"})
    admitted = []
    for rid in POST:
        r = analysis["runs"][rid]
        assert r["finished"] and r["decision_count_matches"] and r["first_logged_floor"] == 1
        assert len(r["config_segments"]) == 1 and not r["config_segments"][0]["restart"]
        assert r["budget_entries"] == r["decision_count"] and not r["missing_budget_entries"]
        assert set(r["L2"]["model_effort"]) == {"gpt-6.1-sol/xhigh"}
        ends = [json.loads(s) for s in gzip.open(HERE / f"inputs-{rid}/runs.jsonl.gz", "rt")]
        assert len(ends) == 1
        admitted.append({"run_id": rid, "startup": r["config_segments"][0], "terminal": ends[0]["_source"], "ended": r["ended"], "duration_minutes": r["duration_minutes"], "budget_rows": r["budget_entries"], "native_L2_model_effort": r["L2"]["model_effort"], "over_90": r["over_90_minutes"]})
    event = json.loads((OUT / "terminal-event.json").read_bytes())
    assert event["terminal"]["sha256"] == admitted[1]["terminal"]["sha256"]
    with (OUT / "latencies-final.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["run_id", "group", "metric", "kind", "n", "p50_ms", "p90_ms", "max_ms"])
        for rid, r in analysis["runs"].items():
            group = "baseline" if rid in analysis["baseline_run_ids"] else "H1" if rid in POST else "old_overlap"
            for metric in ("decision_compute_proxy_ms", "turn_compute_proxy_ms", "decision_budget_actual_ms", "turn_budget_actual_ms"):
                for kind, v in r[metric].items():
                    w.writerow([rid, group, metric, kind, v["n"], v["p50"], v["p90"], v["max"]])
            v = r["L2"]["question_latency_ms_including_failed_traces"]
            w.writerow([rid, group, "L2_question", "L2", v["n"], v["p50"], v["p90"], v["max"]])
    result = {"at": datetime.now().astimezone().isoformat(), "state": "two_complete_H1_observations_delivered_pacing_target_not_met", "admitted": admitted, "excluded_mixed": ["5H83F3J0XSTE"], "unchanged_baseline_ids": analysis["baseline_run_ids"], "selected_valid_original_ranges": selected, "frozen_inputs": evidence, "source_comparability": ref(OUT / "admission-and-R383-comparability.json"), "original_ops_host_readback": ref(OUT / "original-ops-host-readback.json"), "second_one_shot_terminal": ref(OUT / "terminal-event.json"), "lane_mismatches": 0, "explicit_lane_counts": dict(lane_counts), "latency_audit_outliers": anomalies, "analysis": ref(OUT / "analysis-final.json"), "report": ref(HERE / "completed-report.md"), "CSV": ref(OUT / "latencies-final.csv"), "health_limits": "2PQK F33 one sample-identity mismatch episode, two pending then one C1 degraded; root cause unknown; no new stage or fix", "all_budgets_strictly_met": False, "45_to_60_minute_goal_met": False, "victory_or_calibration_improvement_claim": False, "no_game_or_model_calls": True}
    (OUT / "final-admission-and-data-cut.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"admitted": POST, "valid_original_ranges": selected, "lane_mismatches": 0, "latency_outlier_count": len(anomalies), "budget_rows": sum(r["budget_rows"] for r in admitted)}))


if __name__ == "__main__":
    main()
