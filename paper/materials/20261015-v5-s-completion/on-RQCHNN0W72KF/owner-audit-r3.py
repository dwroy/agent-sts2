"""Audit frozen natural on-run metadata and original byte references, without gameplay."""
from collections import Counter, defaultdict
from datetime import datetime
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BASE = Path(__file__).resolve().parent
OUT = BASE / "on-RQCHNN0W72KF"
RUN = "RQCHNN0W72KF"
HOME = str(ROOT / "ops/codex-ops/accounts/codex1/brain")


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def load(path):
    return json.loads(path.read_bytes())


def ref(path):
    return {"path": str(path.relative_to(ROOT)), "sha256": sha(path.read_bytes())}


def raw_row(source):
    with (ROOT / source["path"]).open("rb") as handle:
        handle.seek(source["offset"])
        raw = handle.read(source["bytes"])
    assert raw.endswith(b"\n") and sha(raw) == source["sha256"]
    row = json.loads(raw)
    assert row["run_id"] == RUN
    return row


def instant(text):
    return datetime.fromisoformat(text.replace("Z", "+00:00")).timestamp()


def save(name, value):
    path = OUT / name
    if path.exists():
        original = load(path)
        assert {k: v for k, v in original.items() if k != "at"} == {k: v for k, v in value.items() if k != "at"}
        return
    with path.open("x") as handle:
        handle.write(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def main():
    config = load(OUT / "frozen-runtime/native-config.json")[0]
    terminal = load(OUT / "frozen-runtime/terminal.json")[0]
    raw_row(config["_source"])
    raw_row(terminal["_source"])
    sources = load(OUT / "frozen-runtime/decision-byte-refs.json")
    rows = [raw_row(source) for source in sources]
    assert len(rows) == terminal["decisions"] == 772
    assert all(a["offset"] + a["bytes"] == b["offset"] for a, b in zip(sources, sources[1:]))
    assert len({r.get("decision_id") or f'offset:{s["offset"]}' for r, s in zip(rows, sources)}) == 772
    assert config["restart"] is False and all(config["loop"][key] == "on" for key in ["s_build_rank", "sim_adaptive", "s_readiness", "s_combat_rank"])
    assert config["loop"]["sim_adaptive_admission"] == "accepted"
    native = load(OUT / "native-model-cohort.json")
    assert native["all_native_calls_eligible"] and not native["issues"]
    calls, traces = native["calls"], native["traces"]
    assert len(calls) == len(traces) == 53
    assert {r["question_id"] for r in traces} == {r["question_id"] for r in calls}
    before_path = BASE / "post-on-events/account-2047994-start.json"
    before = load(before_path)
    after_path = OUT / "account-terminal.json"
    after = load(after_path)
    identity_path = ROOT / "paper/materials/20261015-silent-codex1-next-run/account-preflight.json"
    identity = load(identity_path)
    assert identity["target_home"] == HOME and identity["target_account"]["identity_sha256"] == "68c5321817bf49b5a2e858b541b710066d179948bde150668e4e315cc438c4f8"
    assert before["auth_link"] == after["auth_link"] and after["observer_exited_normally"]
    assert before["auth_link"]["target"] == "/home/dw/.codex1/auth.json"
    assert all(before["auth_link"][key] / 1e9 < instant(config["process"]["started"]) for key in ["link_ctime_ns", "target_ctime_ns"])
    assert instant(after["at"]) >= instant(terminal["ended"])
    bindings, brains = [], []
    for ordinal, call in enumerate(calls, 1):
        assert call["question_id"] == f"mv9c9451-2047994-{ordinal}"
        assert (call["engine"], call["model"], call["effort"]) == ("codex", "gpt-6.1-sol", "xhigh")
        assert call["accepted"] and call["attempts"] == 1 and not call["error_kind"]
        brain = raw_row(call["source"])
        brains.append(brain)
        assert brain["question_id"] == call["question_id"] and brain["accepted"] and not brain["problems"]
        matching = [trace for trace in traces if trace["question_id"] == call["question_id"]]
        assert len(matching) == 1
        trace = matching[0]
        raw = raw_row(trace["source"])
        assert raw["outcome"] == "answered" and raw["thread_id"] and raw["turn_id"]
        assert (raw["model"], raw["effort"]) == ("gpt-6.1-sol", "xhigh")
        proof_path = BASE / f"post-on-events/account-2047994-brain-{ordinal}.json"
        proof = load(proof_path)
        assert proof["run_id"] == RUN and proof["pid"] == 2047994 and proof["birth"] == "94859754"
        assert proof["process_observed_alive"] and proof["credentials_not_read"]
        assert proof["brain_home"] == proof["environment"]["BRAIN_CODEX_HOME"] == HOME
        assert (proof["environment"]["BRAIN_CODEX_MODEL"], proof["environment"]["BRAIN_CODEX_EFFORT"]) == ("gpt-6.1-sol", "xhigh")
        assert proof["auth_link"] == before["auth_link"]
        assert instant(config["process"]["started"]) <= instant(call["ts"]) <= instant(proof["at"]) <= instant(terminal["ended"])
        bindings.append({"question_id": call["question_id"], "brain": call["source"], "native": trace["source"], "live_account_proof": ref(proof_path), "account": "codex1", "model": "gpt-6.1-sol", "effort": "xhigh"})
    save("whole-run-account-admission.json", {"at": datetime.now().astimezone().isoformat(), "run_id": RUN, "accepted": True,
         "native_calls": 53, "unknown_or_fallback": 0, "bindings": bindings,
         "identity_proof": ref(identity_path), "start": ref(before_path), "terminal": ref(after_path),
         "method": "Every original physical request binds question/PID to a contemporaneously live immutable codex1 home and unchanged pre-start auth-link/target metadata. Native project request traces bind model/effort/thread/turn. Credentials never read; deleted runtime session files are not reconstructed."})
    p2, off = [], []
    for row, source in zip(rows, sources):
        ranking = (row.get("boss_sim") or {}).get("build_ranking") or {}
        if not ranking:
            continue
        selection = ranking["selection"]
        assert selection["choice"] and not selection["target_pending"] and row.get("chosen") and row["result"].startswith("completed")
        if ranking["delivered"] is False:
            assert ranking["mode"] == "on" and ranking["status"] == "produced"
            assert not ranking["best_group"] and not ranking["candidates"] and selection["deviated"] is None
            assert row["boss_sim"]["completion"]["uniqueDecks"] == 1
            off.append({"source": source, "question_id": row["decision_id"], "floor": row["floor"], "status": ranking["status"], "mode": "on", "reason": "No modeled offered candidate; baseline-only full computation. No ranking fact delivered or override instruction applicable.", "choice": selection, "chosen": row["chosen"], "result": row["result"]})
            continue
        assert ranking["delivered"] is True
        answer = row["deepseek"]
        matches = [brain for brain in brains if brain["label"] == row["label"]
                   and (brain.get("payload", {}).get("facts") or {}).get("floor") == row["floor"]
                   and (brain.get("payload", {}).get("facts") or {}).get("build_ranking", {}).get("best_group") == ranking["best_group"]
                   and brain["answer"].get("choice") == answer.get("choice")
                   and brain["answer"].get("ranking_override_reason") == selection.get("ranking_override_reason")
                   and 0 <= instant(row["ts"]) - instant(brain["ts"]) < 60]
        assert len(matches) == 1, (row["floor"], row["label"], len(matches))
        brain = matches[0]
        p2.append({"question_id": row["decision_id"], "floor": row["floor"], "label": row["label"], "source": source,
                   "brain_question_id": brain["question_id"], "brain_source": next(c["source"] for c in calls if c["question_id"] == brain["question_id"]),
                   "ranking": ranking, "answer": brain["answer"], "logged_selection": selection,
                   "chosen": row["chosen"], "result": row["result"], "accepted": brain["accepted"], "reasks": brain["reasks"]})
    assert len(p2) == 38 and len(off) == 4 and sum(item["logged_selection"]["deviated"] is True for item in p2) == 8
    save("p2-consumer-inputs.json", {"actual_on": p2, "no_modeled_offered_candidate": off})
    failures = defaultdict(list)
    for row, source in zip(rows, sources):
        sim = row.get("boss_sim") or {}
        completion = sim.get("completion") or {}
        if completion.get("required") and completion.get("failure") is True:
            failures[completion["key"]].append((row, source))
    failure_receipts = []
    for key, group in failures.items():
        assert len(group) == 3
        assert [r["boss_sim"]["completion"]["attempts"] for r, _ in group] == [1, 2, 3]
        assert [r["boss_sim"]["completion"]["status"] for r, _ in group] == ["pending", "pending", "degraded"]
        for r, _ in group[:2]:
            assert not r.get("chosen") and r["result"] == "not dispatched: required boss evaluation pending"
        r, source = group[-1]
        sim = r["boss_sim"]
        assert sim["completion"]["samples"] < 300 and not sim.get("lines") and not sim.get("options") and not sim.get("build_ranking")
        assert r["chosen"] and r["result"].startswith("completed")
        # Current-turn rollout facts remain valid; only unavailable whole-fight statistics are suppressed.
        assert "quantitative_fight" not in json.dumps(r.get("questions"), ensure_ascii=False)
        failure_receipts.append({"failure_key": key, "floor": r["floor"], "label": r["label"],
                                 "attempts": [{"source": s, "completion": a["boss_sim"]["completion"], "error": a["boss_sim"].get("error") or a["boss_sim"].get("reason"), "chosen": a.get("chosen"), "result": a["result"]} for a, s in group],
                                 "no_fight_statistics_exposed": True, "completed_first_action_only": True})
    assert len(failure_receipts) == 3
    save("c1-natural-failure-consumer.json", {"at": datetime.now().astimezone().isoformat(), "run_id": RUN,
         "protection_consumed": True, "groups": failure_receipts, "simulation_failures_remain_real": True,
         "limits": "Nonpositive-HP successful-resource guard failures are retained for the original ops/learning chain. No new root-cause simulation, implementation, retry task, restart, or gameplay-model correctness claim."})
    computations = load(OUT / "frozen-runtime-r2/post-on-computations.json")
    report = load(OUT / "report-r2/evaluation.json")
    groups = [group for group in report["runtime"]["computation"]["groups"] if group["cohort"] == "V5-S-P2-C2-on"]
    for lane in ["b2", "b3"]:
        values = sorted(row["elapsed_ms"] for row in computations if row["lane"] == lane)
        def quantile(p):
            x = (len(values) - 1) * p
            a, b = math.floor(x), math.ceil(x)
            return values[a] + (values[b] - values[a]) * (x - a)
        group = next(group for group in groups if group["lane"] == lane)
        assert group["attempts"] == len(values)
        assert group["wall_ms"] == {"n": len(values), "p50": quantile(.5), "p90": quantile(.9), "max": max(values), "sum": sum(values)}
    adaptive_rows = [(row.get("boss_sim") or {}) for row in rows if (row.get("boss_sim") or {}).get("completion", {}).get("status") == "complete_adaptive"]
    inputs = Counter(sim["adaptive"]["input_key"] for sim in adaptive_rows)
    assert len(adaptive_rows) == 89 and len(inputs) == 84
    assert sum(row["elapsed_ms"] for row in computations) == 1714566
    save("owner-audit-summary.json", {"at": datetime.now().astimezone().isoformat(), "run_id": RUN,
         "parent": "roy-20261014-s-decision", "original_owner": "01a139d6-cfec-78e1-8739-e21ac426a354",
         "watcher": "01a13dcd-83d4-7c63-b233-f93cf878ecf4", "complete_raw_decision_coverage": 772,
         "native_codex1_sol_xhigh_calls": 53, "P2_actual_on": 38, "P2_no_modeled_offered_candidate": 4, "P2_overrides": 8,
         "C2_successful_attempts": 89, "C2_independent_input_keys": 84,
         "C2_duplicate_input_multiplicity": dict(Counter(inputs.values())),
         "C1_real_failure_groups": 3, "computation": groups, "observed_wait_ms": 1714566,
         "source_refs": [ref(OUT / name) for name in ["whole-run-account-admission.json", "p2-consumer-inputs.json", "c1-natural-failure-consumer.json", "report-r2/evaluation.json", "evaluator-command-r2.json", "whole-run-health.json", "calibration-provenance.json"]],
         "limits": "On-run has no full counterfactual agreement. Timing includes failures/retries/memo work and is descriptive; 84 health inputs differ from 89 successful attempt identities. Game outcome and model calibration remain separate."})
    print(json.dumps({"account_calls": 53, "P2_on": len(p2), "P2_unsupported": len(off), "C1_groups": len(failures), "compute_attempts": len(computations), "elapsed_ms": 1714566}))


if __name__ == "__main__":
    main()
