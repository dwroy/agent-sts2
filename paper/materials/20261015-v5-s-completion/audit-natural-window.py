"""Freeze one natural run's indexed bytes and inspect shadow coverage; never enable a switch."""
import argparse
from datetime import datetime
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "ops"))
import module_health as health


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def write(path, value):
    with path.open("x") as handle:
        handle.write(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def inspect(decisions, boss_floors=()):
    """Expected rows are selected independently of the feature fields being audited."""
    rows, excluded, issues = [], [], []
    comparisons = {}
    for row in decisions:
        sim = health.obj(row.get("boss_sim"))
        completion = health.obj(sim.get("completion"))
        label = row.get("label")
        b3 = label in health.LABELS and bool(row.get("questions"))
        b2 = bool(label and label.startswith("combat/") and (
            "available" in sim or (row.get("floor") in boss_floors and row.get("questions"))))
        if not b2 and not b3:
            continue
        identity = {"decision_id": row.get("decision_id"), "label": label, "floor": row.get("floor"),
                    "ts": row.get("ts"), "source": row["_source"], "lane": "b2" if b2 else "b3"}
        if sim.get("skipped"):
            excluded.append({**identity, "reason": "explicit_simulation_skip", "detail": sim["skipped"]})
            continue
        if b2 and sim.get("available") is False:
            excluded.append({**identity, "reason": "B2_unavailable", "detail": sim.get("reason"), "completion": completion})
            if completion.get("required") and completion.get("status") != "degraded":
                issues.append({**identity, "reason": "required_B2_computation_unavailable"})
            continue
        if sim.get("error") or not isinstance(sim.get("samples"), (int, float)) or sim.get("samples", 0) <= 0:
            issues.append({**identity, "reason": "missing_or_failed_numeric_simulation", "error": sim.get("error"),
                           "completion": completion})
            continue
        record = {**identity, "samples": sim["samples"], "requested": sim.get("requested"),
                  "completion": completion, "P2": None, "C2": None}
        if b3:
            ranking = health.obj(sim.get("build_ranking"))
            selection = health.obj(ranking.get("selection"))
            record["P2"] = {"status": ranking.get("status"), "mode": ranking.get("mode"),
                            "selection": selection, "best_group": ranking.get("best_group"),
                            "not_simulated": sim.get("not_simulated")}
            if ranking.get("schema") != "build-ranking-v1" or ranking.get("status") != "produced":
                issues.append({**identity, "reason": "missing_P2_ranking"})
            elif not selection or selection.get("choice") is None:
                issues.append({**identity, "reason": "missing_actual_P2_choice"})
            # A fully unsupported question has no selectable simulation candidate for C2.
            questions = health.obj(row.get("questions"))
            criteria = [health.obj(q.get("criteria")) for q in questions.values()
                        if isinstance(q, dict) and q.get("type") == "choice"]
            if not sim.get("options") and any(health.unsupported_candidates(c, sim) for c in criteria):
                record["C2"] = {"excluded": "all_offered_candidates_explicitly_unsupported"}
                rows.append(record)
                continue
        if completion.get("status") == "degraded":
            record["C2"] = {"excluded": "C1_degraded_computation_does_not_run_adaptive_shadow"}
            rows.append(record)
            continue
        if completion.get("required") is not True or sim.get("samples") != sim.get("requested") or sim.get("timed_out"):
            issues.append({**identity, "reason": "not_a_complete_required_shadow_computation"})
            rows.append(record)
            continue
        adaptive = health.obj(sim.get("adaptive"))
        comparison = health.obj(adaptive.get("production_comparison"))
        record["C2"] = {"status": adaptive.get("status"), "input_key": adaptive.get("input_key"),
                        "production_comparison": comparison, "work": adaptive.get("work")}
        groups = [comparison.get("full"), comparison.get("partial")]
        valid = (adaptive.get("status") == "produced" and adaptive.get("mode") == "shadow"
                 and isinstance(adaptive.get("input_key"), str) and bool(adaptive["input_key"])
                 and comparison.get("metric") == "deployed-ranking-first-group"
                 and type(comparison.get("agreement")) is bool
                 and all(isinstance(group, list) and group and all(isinstance(k, str) for k in group) for group in groups))
        if not valid:
            issues.append({**identity, "reason": "missing_final_group_shadow_comparison"})
        else:
            assert comparison["agreement"] == (sorted(groups[0]) == sorted(groups[1]))
            key = (identity["lane"], label, adaptive["input_key"])
            value = {"comparison": comparison, "work": adaptive.get("work")}
            if key in comparisons and comparisons[key] != value:
                issues.append({**identity, "reason": "conflicting_reused_shadow_result"})
            comparisons[key] = value
        rows.append(record)
    independent = [{"lane": k[0], "label": k[1], "input_key": k[2], **value} for k, value in comparisons.items()]
    matched = sum(r["comparison"]["agreement"] for r in independent)
    return {"questions": rows, "explicit_exclusions": excluded, "issues": issues,
            "independent_comparisons": independent, "independent_count": len(independent),
            "agreement": matched / len(independent) if independent else None,
            "mismatches": [r for r in independent if not r["comparison"]["agreement"]],
            "P2_target_pending": sum(bool((r.get("P2") or {}).get("selection", {}).get("target_pending")) for r in rows)}


def main(run_id, out):
    if not re.fullmatch(r"[A-Z0-9]{12}", run_id):
        raise ValueError("invalid run identity")
    out.mkdir(parents=True, exist_ok=False)
    sql = (f"SELECT 'decisions' AS stream,off,len,ts,label FROM decisions WHERE run_id='{run_id}' "
           f"UNION ALL SELECT 'brain' AS stream,off,len,ts,label FROM llm_calls_raw WHERE run_id='{run_id}' AND src='brain' "
           f"UNION ALL SELECT 'run-config' AS stream,off,len,ts,'config' AS label FROM run_config WHERE run_id='{run_id}' "
           f"UNION ALL SELECT 'runs' AS stream,off,len,ended AS ts,'finished' AS label FROM runs_raw WHERE run_id='{run_id}' "
           "ORDER BY ts,stream,off")
    argv = [str(ROOT / "data/logdb-venv/bin/python"), str(ROOT / "agent/tools/logdb/query.py"),
            "--json", "--max-rows", "100000", sql]
    result = subprocess.run(argv, cwd=ROOT, text=True, capture_output=True)
    write(out / "query-command.json", {"argv": argv, "rc": result.returncode, "stderr": result.stderr})
    (out / "index.json").write_text(result.stdout)
    if result.returncode:
        raise RuntimeError("indexed query failed; original output retained")
    index = json.loads(result.stdout)
    assert not index.get("truncated") and not index.get("error")
    fight_argv = [str(ROOT / "data/logdb-venv/bin/python"), str(ROOT / "agent/tools/logdb/query.py"),
                  "--json", "--no-sync", "--max-rows", "10000",
                  f"SELECT run_id,fight_no,floor,room,first_ts,last_ts,first_off,last_off FROM fights WHERE run_id='{run_id}' ORDER BY fight_no"]
    fight_result = subprocess.run(fight_argv, cwd=ROOT, text=True, capture_output=True)
    write(out / "fight-query-command.json", {"argv": fight_argv, "rc": fight_result.returncode, "stderr": fight_result.stderr})
    (out / "fights-index.json").write_text(fight_result.stdout)
    assert fight_result.returncode == 0
    fights = json.loads(fight_result.stdout)
    assert not fights.get("truncated") and not fights.get("error")
    fight_rows = [dict(zip(fights["columns"], values)) for values in fights["rows"]]
    boss_floors = {row["floor"] for row in fight_rows if row["room"] == "boss"}
    streams = {name: [] for name in ["decisions", "brain", "run-config", "runs"]}
    refs = []
    for values in index["rows"]:
        row = dict(zip(index["columns"], values))
        path = ROOT / "logs" / (row["stream"] + ".jsonl")
        with path.open("rb") as handle:
            handle.seek(row["off"])
            raw = handle.read(row["len"])
        assert raw.endswith(b"\n")
        value = json.loads(raw)
        assert health.run_of(value) == run_id
        ref = {"path": str(path.relative_to(ROOT)), "offset": row["off"], "bytes": row["len"], "sha256": sha(raw)}
        refs.append(ref)
        value["_source"] = ref
        streams[row["stream"]].append(value)
    configs, decisions, brains, finishes = (streams[n] for n in ["run-config", "decisions", "brain", "runs"])
    assert configs and all(c.get("character") == "SILENT" for c in configs)
    config = configs[0]
    modes = {key: config.get("loop", {}).get(key) for key in ["s_readiness", "s_combat_rank", "s_build_rank", "sim_adaptive"]}
    assert modes == {"s_readiness": "on", "s_combat_rank": "on", "s_build_rank": "shadow", "sim_adaptive": "shadow"}
    for source in ["f685e05173341c045b851a0986f5151b2f915816", "600915d133011c0eb1d063f61df9691bba4aba67"]:
        subprocess.run(["git", "merge-base", "--is-ancestor", source, config["code"]["commit"]], cwd=ROOT, check=True)
    coverage = inspect(decisions, boss_floors)
    count_matches = len(finishes) == 1 and finishes[0].get("decisions") == len(decisions)
    snapshot = json.loads((ROOT / "data/logdb/manifest.json").read_text())
    source_state = {k: {a: v for a, v in snapshot["sources"][k].items() if a != "shards"}
                    for k in streams if k in snapshot["sources"]}
    value = {"at": datetime.now().astimezone().isoformat(), "run_id": run_id, "parent": "roy-20261014-s-decision",
             "configurations": [{k: c.get(k) for k in ["ts", "character", "ascension", "code", "loop", "process", "_source"]} for c in configs],
             "source_refs": refs, "source_state_at_read": source_state,
             "boss_room_context": {"path": str(out / "fights-index.json"), "sha256": sha(fight_result.stdout.encode()), "boss_floors": sorted(boss_floors)},
             "indexed_counts": {k: len(v) for k, v in streams.items()}, "finished_rows": finishes,
             "finished_decision_count_matches": count_matches,
             "whole_run_candidate_for_review": count_matches and len(configs) == 1 and not coverage["issues"],
             "coverage": coverage, "health": {"P1": health.readiness_pipeline(config, decisions, brains),
                 "P2": health.build_ranking_health(config, decisions, brains),
                 "P3": health.combat_s_ranking_health(config, decisions), "C2": health.adaptive_health(config, decisions)},
             "limits": "An ongoing run is never a complete shadow run. Terminal identity, all exclusions/unknown targets, native code, "
                       "byte coverage and both completed runs require owner readback. This tool does not register an ACK or enable on."}
    write(out / "audit.json", value)
    print(json.dumps({"run_id": run_id, "counts": value["indexed_counts"], "candidate_for_review": value["whole_run_candidate_for_review"],
                      "issues": len(coverage["issues"]), "independent": coverage["independent_count"], "agreement": coverage["agreement"]}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("run_id")
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    main(args.run_id, args.output)
