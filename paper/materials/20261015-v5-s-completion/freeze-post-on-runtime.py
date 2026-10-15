"""Freeze one completed on-run and append it to existing evaluator inputs; no simulation/API."""
import argparse
from datetime import datetime
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[3]


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def main(args):
    assert re.fullmatch(r"[A-Z0-9]{12}", args.run)
    out = args.output.resolve()
    out.mkdir(exist_ok=False, parents=True)
    evaluator = ROOT / ".worktrees/live/eval/s_decision.py"
    spec = importlib.util.spec_from_file_location("deployed_s_eval", evaluator)
    report = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(report)
    refs = [{"path": str(evaluator), "sha256": digest(evaluator.read_bytes())}]

    def save(name, value):
        path = out / name
        with path.open("x") as handle:
            handle.write(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
        ref = {"path": str(path), "sha256": digest(path.read_bytes())}
        refs.append(ref)
        return ref

    def query(name, sql, sync=False):
        argv = [str(ROOT / "data/logdb-venv/bin/python"), str(ROOT / "agent/tools/logdb/query.py"),
                "--json", "--max-rows", "100000"]
        if not sync:
            argv.append("--no-sync")
        cp = subprocess.run(argv + [sql], cwd=ROOT, text=True, capture_output=True)
        save(name + "-command.json", {"argv": argv + [sql], "rc": cp.returncode, "stderr": cp.stderr})
        (out / (name + "-index.json")).write_text(cp.stdout)
        assert cp.returncode == 0, cp.stderr
        data = json.loads(cp.stdout)
        rows = report.exported_rows(data)
        refs.append({"path": str(out / (name + "-index.json")), "sha256": digest(cp.stdout.encode())})
        return rows

    def raw_rows(index, stream):
        rows = []
        path = ROOT / "logs" / (stream + ".jsonl")
        with path.open("rb") as handle:
            for ref in index:
                handle.seek(ref["off"])
                raw = handle.read(ref["len"])
                assert raw.endswith(b"\n")
                value = json.loads(raw)
                assert value["run_id"] == args.run
                value["_source"] = {"path": str(path.relative_to(ROOT)), "offset": ref["off"],
                                    "bytes": ref["len"], "sha256": digest(raw)}
                rows.append(value)
        return rows

    clause = f"WHERE run_id='{args.run}'"
    config_index = query("config", f"SELECT off,len,ts FROM run_config {clause} ORDER BY ts,off", sync=True)
    decision_index = query("decisions", f"SELECT off,len,ts,latency_jev_ms,reused_answer,no_jev,turn FROM decisions {clause} ORDER BY ts,off")
    brain_index = query("brain", f"SELECT off,len,ts FROM llm_calls_raw {clause} AND src='brain' ORDER BY ts,off")
    terminal_index = query("terminal", f"SELECT off,len,ended FROM runs_raw {clause} ORDER BY ended,off")
    fights = query("fights", f"SELECT * FROM fights {clause} ORDER BY fight_no")
    attempts = query("attempts", f"SELECT * FROM sl_attempts {clause} ORDER BY floor,attempt")
    floor_acts = query("floor-acts", f"SELECT floor,min(act) AS act,count(DISTINCT act) AS act_count FROM frames {clause} GROUP BY floor ORDER BY floor")
    act_by_floor = {row["floor"]: row["act"] for row in floor_acts if row["act_count"] == 1}
    configs = raw_rows(config_index, "run-config")
    decisions = raw_rows(decision_index, "decisions")
    brains = raw_rows(brain_index, "brain")
    terminals = raw_rows(terminal_index, "runs")
    assert len(configs) == len(terminals) == 1
    config = configs[0]
    assert config["character"] == "SILENT" and not config["restart"]
    assert config["loop"]["s_build_rank"] == config["loop"]["sim_adaptive"] == "on"
    assert config["loop"]["sim_adaptive_admission"] == "accepted"
    assert terminals[0]["decisions"] == len(decisions)
    trust_raw = subprocess.check_output(["git", "show", config["code"]["commit"] + ":knowledge/characters/silent/boss-trust.json"], cwd=ROOT)
    (out / "native-boss-trust.json").write_bytes(trust_raw)
    refs.append({"path": str(out / "native-boss-trust.json"), "sha256": digest(trust_raw),
                 "native_commit": config["code"]["commit"], "original_path": "knowledge/characters/silent/boss-trust.json"})
    for stream, index in [("decisions", decision_index), ("brain", brain_index)]:
        ordered = sorted(index, key=lambda row: row["off"])
        assert all(a["off"] + a["len"] == b["off"] for a, b in zip(ordered, ordered[1:])), stream
    baseline_path = ROOT / "paper/materials/20261015-s-decision-eval/frozen-runtime/runtime.json"
    baseline = json.loads(baseline_path.read_bytes())
    refs.append({"path": str(baseline_path), "sha256": digest(baseline_path.read_bytes())})
    cohort = args.cohort
    computations, calls, predictions, overrides, excluded = [], [], [], [], []
    prediction_seen = set()
    for row, index in zip(decisions, decision_index):
        common = {"character": "SILENT", "run_id": args.run, "cohort": cohort, "ts": row["ts"],
                  "floor": row["floor"], "native_commit": config["code"]["commit"], "source": row["_source"]}
        sim = row.get("boss_sim") or {}
        completion = sim.get("completion") or {}
        if completion.get("required") is True:
            attempt_id = completion.get("attempt_id")
            if not attempt_id:
                excluded.append({"source": row["_source"], "reason": "missing actual mandatory computation attempt identity"})
            else:
                computations.append({**common, "attempt_id": attempt_id, "question_id": row.get("decision_id"),
                                     "required": True, "lane": "b2" if str(row.get("label", "")).startswith("combat/") else "b3",
                                     "status": completion.get("status"), "elapsed_ms": sim.get("ms"),
                                     "samples": sim.get("samples"), "requested": sim.get("requested")})
        if (index.get("latency_jev_ms") or 0) > 0 and not row.get("reused_answer") and not row.get("no_jev"):
            usage = row.get("usage") or {}
            calls.append({**common, "call_id": row["decision_id"], "provider": "jev", "request_ids": row.get("request_ids"),
                          "input_tokens": usage.get("input_tokens") if row.get("decider") == "jev" else None,
                          "output_tokens": usage.get("output_tokens") if row.get("decider") == "jev" else None,
                          "latency_ms": index["latency_jev_ms"]})
        if sim.get("available") is True and row.get("turn") == 1:
            same = [a for a in attempts if a["floor"] == row["floor"]]
            matched = [a for a in same if report.instant(a["started_at"]) <= report.instant(row["ts"]) <= report.instant(a["ended_at"])]
            attempt = matched[0]["attempt"] if len(matched) == 1 else 1 if not same else None
            choice = (row.get("answers") or {}).get("plan", {}).get("choice")
            # Runtime records place the accepted answer in deepseek.choice on some source cohorts.
            choice = choice or (row.get("deepseek") or {}).get("choice")
            line = (sim.get("lines") or {}).get(choice) or {}
            audit = row.get("selection_audit") or {}
            intended = (audit.get("answer") or {}).get("planned_steps")
            executed = (audit.get("after_sl") or {}).get("planned_steps")
            dispatched = row.get("selection_dispatch") or {}
            encounter = [f for f in fights if f["floor"] == row["floor"]]
            unique = (row["floor"], attempt)
            if (unique not in prediction_seen and len(encounter) == 1 and sim.get("boss") in encounter[0]["monsters"]
                    and attempt is not None and intended and intended == executed
                    and dispatched.get("returned_status") == "completed" and report.number(line.get("cal"))):
                prediction_seen.add(unique)
                outcome = report.link_outcome({**common, "attempt": attempt}, fights, attempts)
                predictions.append({**common, "prediction_id": row["decision_id"], "boss": sim["boss"],
                                    "ascension": encounter[0]["ascension"], "attempt": attempt, "probability": line["cal"],
                                    "binding": "exact_boss_attempt", "outcome": outcome["outcome"],
                                    "outcome_binding": outcome, "selected_plan": choice,
                                    "scope": "conditional model on earliest T1 selected plan with completed first action; full-plan execution unknown"})
        ranking = sim.get("build_ranking") or {}
        if ranking:
            selection = ranking.get("selection") or {}
            boss_fights = [f for f in fights if f["room"] == "boss" and f["floor"] > row["floor"]
                           and sim.get("boss") in f["monsters"] and f["act"] == act_by_floor.get(row["floor"])]
            future = min(boss_fights, key=lambda f: f["floor"]) if boss_fights else None
            exact = None
            if future:
                sl = [a for a in attempts if a["floor"] == future["floor"] and a["attempt"] == 1]
                if len(sl) == 1 and sl[0]["result"] in ("won", "died"):
                    exact = sl[0]["result"]
                elif not any(a["floor"] == future["floor"] for a in attempts):
                    exact = future.get("outcome")
            overrides.append({**common, "question_id": row["decision_id"], "mode": ranking.get("mode"),
                              "boss": sim.get("boss"), "ascension": sim.get("asc") if sim.get("asc") is not None else config["ascension"], "deviated": selection.get("deviated"),
                              "target_pending": selection.get("target_pending"), "reason": selection.get("ranking_override_reason"),
                              "outcome": exact, "outcome_binding": "same_run_act_first_boss_attempt" if exact else None,
                              "outcome_id": f'{args.run}/F{future["floor"]}/first' if exact else None})
    save("native-config.json", configs)
    save("native-brain.json", brains)
    save("terminal.json", terminals)
    save("decision-byte-refs.json", [row["_source"] for row in decisions])
    save("post-on-computations.json", computations)
    save("post-on-jev-calls.json", calls)
    save("post-on-predictions.json", predictions)
    save("post-on-overrides.json", overrides)
    save("post-on-excluded.json", excluded)
    runtime = {"schema": "s-decision-runtime-v1", "at": datetime.now().astimezone().isoformat(),
               "source_refs": [*baseline["source_refs"], *refs], "cohorts": [*baseline["cohorts"], cohort],
               "coverage": {"complete": False, "prior": baseline["coverage"], "post_on_run": args.run,
                            "post_on_complete": True, "post_on_decisions": len(decisions),
                            "limits": "Baseline window remains partial; on run is complete. Actual attempts/native commits stay separate; cohort differences are descriptive, not causal."}}
    provenance_path = ROOT / "paper/materials/20261015-v5-s-completion" / ("on-" + args.run) / "calibration-provenance.json"
    if provenance_path.exists():
        provenance = json.loads(provenance_path.read_bytes())
        assert provenance["run_id"] == args.run and provenance["native_commit"] == config["code"]["commit"]
        runtime["coverage"]["fixed_model_calibration_boundary"] = provenance["calibration"]
        runtime["coverage"]["calibration_limit"] = provenance["limits"]
        runtime["source_refs"].append({"path": str(provenance_path), "sha256": digest(provenance_path.read_bytes())})
    for name, rows in [("computations", computations), ("jev_calls", calls), ("predictions", predictions), ("overrides", overrides)]:
        runtime[name] = [*baseline[name], *rows]
    save("runtime.json", runtime)
    print(json.dumps({"run_id": args.run, "native_commit": config["code"]["commit"], "decisions": len(decisions),
                      "computations": len(computations), "jev": len(calls), "predictions": len(predictions),
                      "overrides": len(overrides), "excluded": len(excluded), "evaluator_sha256": refs[0]["sha256"]}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("run")
    parser.add_argument("output", type=Path)
    parser.add_argument("--cohort", default="V5-S-P2-C2-on")
    main(parser.parse_args())
