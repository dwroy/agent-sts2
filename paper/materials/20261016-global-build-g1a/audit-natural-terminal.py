"""Freeze and inspect one ended interface run. No game, model, query sync or admission writes."""
import argparse
from collections import Counter, defaultdict
from datetime import datetime
import gzip
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "ops"))
import module_health as health


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def load(path):
    return json.loads(path.read_bytes())


def save(path, value):
    with path.open("x") as handle:
        handle.write(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def instant(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()


def reference(path):
    return {"path": str(path.relative_to(ROOT)), "sha256": sha(path.read_bytes())}


def freeze_stream(bound, run, output):
    path = ROOT / bound["path"]
    selected, refs, malformed = [], [], []
    with path.open("rb") as source, gzip.open(output, "xb", compresslevel=1) as frozen:
        source.seek(bound["lower_bound"])
        end = path.stat().st_size
        first = True
        while source.tell() < end:
            offset = source.tell()
            raw = source.readline(end - offset)
            if not raw.endswith(b"\n"):
                break
            if first and bound.get("first_record_sha256"):
                assert sha(raw) == bound["first_record_sha256"], "historical lower-bound row changed"
            first = False
            if run.encode() not in raw:
                continue
            try:
                row = json.loads(raw)
            except (ValueError, UnicodeDecodeError):
                malformed.append(offset)
                continue
            if health.run_of(row) != run:
                continue
            ref = {"path": bound["path"], "offset": offset, "bytes": len(raw), "sha256": sha(raw)}
            frozen.write(raw)
            refs.append(ref)
            row["_source"] = ref
            selected.append(row)
        stopped = source.tell()
    return selected, {"path": bound["path"], "lower_bound": bound["lower_bound"],
                      "frozen_end": end, "read_end": stopped, "malformed_matching_offsets": malformed,
                      "selected_rows": len(selected), "source_refs": refs, "frozen": reference(output)}


def account_and_native(directory, config, terminal, brains, traces):
    before = load(directory / "controller-account-start.json")
    after = load(directory / "terminal-account-metadata.json")
    identity = load(ROOT / before["identity"]["path"])
    home = str(ROOT / "ops/codex-ops/accounts/codex1/brain")
    start, end = instant(config["process"]["started"]), instant(terminal["ended"])
    assert sha((ROOT / before["identity"]["path"]).read_bytes()) == before["identity"]["sha256"]
    prior = ROOT / before["prior_metadata"]["path"]
    assert sha(prior.read_bytes()) == before["prior_metadata"]["sha256"]
    metadata = before["auth_link"]
    env = before["environment"]
    account_ok = (before["run_id"] == after["run_id"] == config["run_id"]
                  and before["pid"] == config["process"]["pid"] and before["birth"] > 0
                  and before["process_observed_alive"] and before["credentials_not_read"]
                  and before["account_binding_verified_now"] and start <= instant(before["at"]) <= end
                  and env.get("BRAIN_CODEX_HOME") == before["brain_home"] == home
                  and (env.get("BRAIN_CODEX_MODEL"), env.get("BRAIN_CODEX_EFFORT")) == ("gpt-6.1-sol", "xhigh")
                  and metadata == after["auth_link"] == load(prior)["auth_link"]
                  and after["auth_link_metadata_unchanged"] and after["credentials_not_read"]
                  and instant(after["at"]) >= end
                  and metadata["target"] == "/home/dw/.codex1/auth.json"
                  and all(metadata[k] / 1e9 < start for k in ["link_ctime_ns", "target_ctime_ns"])
                  and identity["target_home"] == home
                  and identity["target_account"]["identity_sha256"] == "68c5321817bf49b5a2e858b541b710066d179948bde150668e4e315cc438c4f8")
    issues, bindings, groups = [], [], defaultdict(list)
    for trace in traces:
        groups[trace.get("question_id")].append(trace)
        if (trace.get("model"), trace.get("effort")) != ("gpt-6.1-sol", "xhigh"):
            issues.append({"reason": "physical_native_request_model_or_effort_unknown_or_different", "source": trace["_source"]})
        if not trace.get("thread_id") or (trace.get("mode") == "session" and not trace.get("turn_id")):
            issues.append({"reason": "native_thread_or_session_turn_unknown", "source": trace["_source"]})
        if not start <= instant(trace["ts"]) <= end:
            issues.append({"reason": "native_request_outside_controller_terminal_window", "source": trace["_source"]})
    question_ids = {row.get("question_id") for row in brains}
    for row in brains:
        qid = row.get("question_id")
        cohort = (row.get("engine"), row.get("model"), row.get("effort"))
        matched = [t for t in groups.get(qid, []) if instant(t["ts"]) <= instant(row["ts"])]
        if cohort != ("codex", "gpt-6.1-sol", "xhigh"):
            issues.append({"reason": "brain_fallback_or_unknown_model", "source": row["_source"], "cohort": cohort})
        if not qid or not re.fullmatch(r"[a-z0-9]+-" + str(before["pid"]) + r"-[1-9][0-9]*", qid):
            issues.append({"reason": "question_controller_identity_unknown", "source": row["_source"]})
        if not matched or not any(t.get("outcome") == "answered" for t in matched):
            issues.append({"reason": "missing_answered_native_trace", "source": row["_source"]})
        if not row.get("accepted") or row.get("problems") or row.get("error_kind") or not row.get("attempts"):
            issues.append({"reason": "brain_not_accepted_or_not_dispatched", "source": row["_source"]})
        if not start <= instant(row["ts"]) <= end:
            issues.append({"reason": "brain_outside_controller_terminal_window", "source": row["_source"]})
        bindings.append({"question_id": qid, "brain": row["_source"],
                         "native": [t["_source"] for t in matched], "cohort": cohort,
                         "account": "codex1" if account_ok else "unknown"})
    for qid, group in groups.items():
        if not qid or qid not in question_ids:
            issues.append({"reason": "orphan_physical_native_request", "question_id": qid,
                           "sources": [t["_source"] for t in group]})
    return {"account_continuity": account_ok, "brain_rows": len(brains), "physical_requests": len(traces),
            "physical_outcomes": dict(Counter(t.get("outcome") for t in traces)), "bindings": bindings,
            "issues": issues, "eligible_for_owner_review": bool(brains and traces and account_ok and not issues),
            "method": "Complete raw brain/native windows bind question IDs to the original controller PID. Its live immutable environment and unchanged pre-start auth link/target metadata bind codex1; native request traces bind actual model/effort/thread/turn. No credential content is opened.",
            "limits": "Endpoint metadata is not a per-call account field; unknown PID, changed metadata, fallback or missing native trace fails this gate. Failed native attempts are retained separately from accepted decisions."}


def continuous_values(value, path="boss_sim"):
    if isinstance(value, dict):
        if value.get("schema") == "continuous-boss-result-v1":
            yield path, value
        else:
            for key, child in value.items():
                yield from continuous_values(child, path + "." + str(key))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from continuous_values(child, path + f"[{index}]")


def continuous_audit(decisions):
    records, issues, transfers = [], [], []
    for row in decisions:
        for path, value in continuous_values(row.get("boss_sim")):
            record = {"source": row["_source"], "decision_id": row.get("decision_id"),
                      "floor": row.get("floor"), "label": row.get("label"), "path": path, "value": value}
            records.append(record)
            if (value.get("calibration") != {"status": "unknown", "singleFightMapApplied": False}
                    or value.get("S") != {"status": "unknown", "value": None}
                    or value.get("scope") != "raw_simulation"
                    or value.get("resourceModel") != {"transfer": "same_sample", "rewardsBetweenFights": "unknown",
                       "actualSecondOpening": "unknown", "unobservedOpeningEffects": "unknown"}):
                issues.append({"reason": "unknown_boundary_not_preserved", "source": row["_source"], "path": path})
            first, second, joint = (value[k] for k in ["first", "secondGivenFirstWin", "joint"])
            if (first["samples"] != value["expectedSamples"] or second["samples"] != first["wins"]
                    or joint["samples"] != first["samples"] or joint["wins"] != second["wins"]
                    or value["missingSamples"] != max(0, value["expectedSamples"] - value["samples"])):
                issues.append({"reason": "denominator_mismatch", "source": row["_source"], "path": path})
            for key in ["first", "secondGivenFirstWin", "joint"]:
                rate = value[key]
                valid = (rate["value"] is None and bool(rate["reason"])) if rate["reason"] else (
                    rate["samples"] > 0 and rate["unknown"] == 0 and isinstance(rate["value"], (int, float))
                    and math.isclose(rate["value"], rate["wins"] / rate["samples"], abs_tol=1e-12))
                if not valid or not 0 <= rate["wins"] <= rate["samples"] or rate["unknown"] < 0:
                    issues.append({"reason": "rate_unknown_or_value_mismatch", "source": row["_source"], "path": path + "." + key})
            for index, trace in enumerate(value.get("traces", [])):
                if trace.get("firstWon") is not True:
                    continue
                a, b, loss = trace.get("firstResources"), trace.get("secondEntry"), trace.get("openingHpLoss")
                valid = (isinstance(a, dict) and isinstance(b, dict) and isinstance(loss, (int, float))
                         and math.isfinite(loss) and loss >= 0 and isinstance(trace.get("seed"), (int, float))
                         and bool(trace.get("secondBoss")) and trace.get("firstHp") == a.get("hp")
                         and a.get("hp", 0) > 0 and b.get("hp", 0) > 0
                         and b.get("hp") == a["hp"] - loss
                         and isinstance(a.get("potionSlots"), list) and a["potionSlots"] == b.get("potionSlots")
                         and isinstance(a.get("revives"), list) and a["revives"] == b.get("revives")
                         and trace.get("firstCapped") is False and trace.get("firstTimeUp") is False)
                item = {"source": row["_source"], "path": path + f".traces[{index}]", "trace": trace, "valid": valid}
                transfers.append(item)
                if not valid:
                    issues.append({"reason": "winning_sample_transfer_missing_or_mismatched", "source": row["_source"], "path": item["path"]})
    return {"summaries": records, "simulated_same_sample_transfers": transfers, "issues": issues,
            "valid_positive_transfers": sum(t["valid"] for t in transfers),
            "eligible_for_owner_review": bool(any(t["valid"] for t in transfers) and not issues),
            "limits": "Production-generated simulation resources only. Actual rewards and the next actionable game opening remain unknown. No summary-only, old-code, calibration or gameplay-benefit admission."}


def latency(decisions):
    seen, groups, status_groups, attempts = set(), defaultdict(list), defaultdict(list), []
    for row in decisions:
        sim = health.obj(row.get("boss_sim"))
        completion = health.obj(sim.get("completion"))
        if not completion.get("required"):
            continue
        identity = completion.get("attempt_id") or json.dumps(row["_source"], sort_keys=True)
        if identity in seen:
            continue
        seen.add(identity)
        lane = "b2" if str(row.get("label", "")).startswith("combat/") else "b3"
        ms = sim.get("ms")
        item = {"source": row["_source"], "lane": lane, "completion": completion,
                "wall_ms": ms, "sim_ms": sim.get("sim_ms"),
                "memo_hint": health.obj(row.get("timing")).get("memo"), "memoHit": completion.get("memoHit")}
        attempts.append(item)
        if isinstance(ms, (int, float)) and not isinstance(ms, bool) and math.isfinite(ms) and ms >= 0:
            groups[lane].append(ms)
            status_groups[(lane, completion.get("status", "unknown"))].append(ms)
    def stats(values):
        values = sorted(values)
        def q(p):
            if not values:
                return None
            position = (len(values) - 1) * p
            lo, hi = math.floor(position), math.ceil(position)
            return values[lo] + (values[hi] - values[lo]) * (position - lo)
        return {"n": len(values), "p50": q(.5), "p90": q(.9), "max": max(values) if values else None}
    return {"attempts": attempts, "reported_wall_ms": {lane: stats(groups[lane]) for lane in ["b2", "b3"]},
            "reported_wall_ms_by_status": [{"lane": lane, "status": status, **stats(values)}
                                          for (lane, status), values in sorted(status_groups.items())],
            "missing_wall_ms": sum(not isinstance(t["wall_ms"], (int, float)) for t in attempts),
            "scope": "Reported question wall time; duplicate completion attempt IDs excluded. Raw memo hints, failures, retries and statuses retained for owner review; no unobserved compute duration or time saving inferred."}


def main(directory, output):
    event = load(directory / "terminal-event.json")  # Never scan an unfinished run.
    run = event["run_id"]
    assert directory.name == "natural-" + run
    output.mkdir(exist_ok=False)
    streams, manifests = {}, []
    for bound in load(directory / "log-start-bounds.json")["files"]:
        stream = Path(bound["path"]).stem
        rows, manifest = freeze_stream(bound, run, output / (stream + ".jsonl.gz"))
        streams[stream] = rows
        manifests.append(manifest)
    save(output / "raw-window-manifest.json", {"run_id": run, "streams": manifests})
    configs, finishes = streams["run-config"], streams["runs"]
    assert len(configs) == len(finishes) == 1, "restarts, unknown configuration or terminal fragments cannot qualify"
    config, terminal = configs[0], finishes[0]
    assert config["restart"] is False and config["character"].upper() == "SILENT"
    assert config["process"]["pid"] == load(directory / "controller-account-start.json")["pid"]
    assert {k: v for k, v in config.items() if k != "_source"} == load(directory / "startup-config.jsonl")
    ref = event["source"]
    assert terminal["_source"] == ref and sha((directory / "terminal-row.jsonl").read_bytes()) == ref["sha256"]
    decisions, brains, traces = (streams[k] for k in ["decisions", "brain", "codex-calls"])
    assert decisions and len(decisions) == terminal["decisions"], "complete raw decision count required"
    assert len({r.get("decision_id") or json.dumps(r["_source"], sort_keys=True) for r in decisions}) == len(decisions)
    assert all(instant(config["ts"]) <= instant(r["ts"]) <= instant(terminal["ended"]) for r in decisions)
    source = load(directory / "startup-manifest.json")["source_commit"]
    subprocess.run(["git", "merge-base", "--is-ancestor", source, config["code"]["commit"]], cwd=ROOT, check=True)
    host = load(HERE / "interface-host-completion-readback.json")
    for leaf in host["actual_six_source_leaves_in_exact_checked_tree"]:
        raw = subprocess.check_output(["git", "show", config["code"]["commit"] + ":" + leaf["path"]], cwd=ROOT)
        assert sha(raw) == leaf["sha256"]
    assert not any(p.startswith(("agent/", "ops/")) for p in config["code"].get("dirty_files", []))
    native = account_and_native(directory, config, terminal, brains, traces)
    continuous = continuous_audit(decisions)
    computed = {"P1": health.readiness_pipeline(config, decisions, brains),
                "P2": health.build_ranking_health(config, decisions, brains),
                "P3": health.combat_s_ranking_health(config, decisions),
                "C2": health.adaptive_health(config, decisions), "C1": health.computation_health(decisions)}
    for name, value in [("native", native), ("continuous", continuous), ("health", computed), ("latency", latency(decisions))]:
        save(output / (name + ".json"), value)
    summary = {"at": datetime.now().astimezone().isoformat(), "parent": "roy-20261016-global-build", "run_id": run,
               "script": reference(Path(__file__).resolve()), "health_sources": [reference(ROOT / "ops" / n) for n in ["module_health.py", "adaptive_health.py"]],
               "terminal": terminal, "counts": {k: len(v) for k, v in streams.items()},
               "native_candidate": native["eligible_for_owner_review"], "continuous_candidate": continuous["eligible_for_owner_review"],
               "malformed_matching_rows": sum(len(m["malformed_matching_offsets"]) for m in manifests),
               "source_six_leaves_verified": True, "dirty_runtime_whole_tree_checked_or_production_recalibrated": False,
               "natural_gate_registered": False, "owner_health_failure_and_complete_window_review_required": True,
               "limits": "This tool only freezes evidence and proposes candidates. Owner reviews all exclusions and service failures before acceptance. Original source full1/one-case0, host0 and runtime knowledge scope remain separate. Roy S decision and all wider parents unchanged."}
    save(output / "summary.json", summary)
    print(json.dumps({k: summary[k] for k in ["run_id", "counts", "native_candidate", "continuous_candidate", "natural_gate_registered"]}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    main(args.directory.resolve(), args.output.resolve())
