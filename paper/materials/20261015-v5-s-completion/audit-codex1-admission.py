"""Require native request, account continuity and complete natural shadow coverage together."""
import argparse
from copy import deepcopy
from datetime import datetime
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[3]
HOME = str(ROOT / "ops/codex-ops/accounts/codex1/brain")
AUTH = "/home/dw/.codex1/auth.json"
IDENTITY = "68c5321817bf49b5a2e858b541b710066d179948bde150668e4e315cc438c4f8"
EXPECTED = ("codex", "gpt-6.1-sol", "xhigh")


def instant(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def read_ref(ref):
    with (ROOT / ref["path"]).open("rb") as handle:
        handle.seek(ref["offset"])
        raw = handle.read(ref["bytes"])
    assert raw.endswith(b"\n") and sha(raw) == ref["sha256"]
    return json.loads(raw)


def inspect(audit, native, before, after, auth, identity, all_traces):
    """Pure metadata gate; missing evidence is a rejection, never an empty success."""
    issues = []

    def require(condition, reason):
        if not condition:
            issues.append(reason)

    run = audit["run_id"]
    configs = audit["configurations"]
    require(len(configs) == 1, "one original controller configuration required")
    require(audit["whole_run_candidate_for_review"] and audit["finished_decision_count_matches"],
            "complete indexed terminal window required")
    require(all(x.get("run_id") == run for x in [native, before, after, auth]), "run identity mismatch")
    require(native["all_native_calls_eligible"] and not native["issues"], "native model cohort rejected")
    require(bool(native["calls"]), "no native brain calls")
    require(before["environment"].get("BRAIN_CODEX_HOME") == HOME and before["brain_home"] == HOME,
            "controller is not bound to codex1 brain home")
    require(before["environment"].get("BRAIN_CODEX_MODEL") == EXPECTED[1]
            and before["environment"].get("BRAIN_CODEX_EFFORT") == EXPECTED[2], "controller model mismatch")
    require(identity["target_home"] == HOME and identity["target_account"]["identity_sha256"] == IDENTITY
            and identity["auth_link_metadata_target"] == AUTH, "missing verified codex1 account mapping")
    require(before["auth_link"] == after["auth_link"] and after["auth_link_metadata_unchanged"],
            "account link or authentication file changed across terminal boundary")
    require(before["auth_link"]["target"] == AUTH and auth["target"] == AUTH,
            "unknown or alternate authentication target")
    require(auth["link_inode"] == before["auth_link"]["link_inode"]
            and auth["target_inode"] == before["auth_link"]["target_inode"], "authentication inode changed")
    config = configs[0]
    require(config["process"]["pid"] == before["pid"] and bool(before["birth"]),
            "unknown controller PID/birth")
    started = instant(config["process"]["started"])
    require(auth["link_ctime_ns"] / 1e9 < started and auth["target_ctime_ns"] / 1e9 < started,
            "account continuity does not predate original controller")
    require(len(audit["finished_rows"]) == 1, "exactly one terminal row required")
    ended = instant(audit["finished_rows"][0]["ended"])
    require(instant(after["at"]) >= ended, "account endpoint predates terminal")
    require(started <= instant(before["at"]) <= ended, "live controller account proof outside run")
    require(config["loop"]["s_readiness"] == config["loop"]["s_combat_rank"] == "on"
            and config["loop"]["s_build_rank"] == config["loop"]["sim_adaptive"] == "shadow",
            "wrong native feature modes")
    calls = native["calls"]
    qids = {c["question_id"] for c in calls}
    require(len(qids) == len(calls), "duplicate or missing native question identity")
    require({t["question_id"] for t in all_traces} == qids, "orphan or missing native request trace")
    require(len(all_traces) == len(native["traces"]), "unreported physical request attempts")
    bindings = []
    for call in calls:
        qid = call["question_id"]
        match = re.fullmatch(r"[a-z0-9]+-(\d+)-\d+", qid or "")
        require(bool(match) and int(match[1]) == before["pid"], "native request/controller PID mismatch")
        require(tuple(call[k] for k in ["engine", "model", "effort"]) == EXPECTED,
                "fallback or unknown native brain model")
        require(call["accepted"] is True and call["dispatch_status"] == "requires_native_trace",
                "unanswered or undispatched brain request")
        require(started <= instant(call["ts"]) <= instant(before["at"]),
                "native request lacks a later live controller account proof")
        traces = [t for t in all_traces if t["question_id"] == qid]
        require(bool(traces) and any(t["outcome"] == "answered" for t in traces), "missing answered request")
        for trace in traces:
            require((trace["model"], trace["effort"]) == EXPECTED[1:], "alternate native request model")
            require(bool(trace.get("thread_id")) and bool(trace.get("turn_id")), "unknown native turn identity")
        bindings.append({"question_id": qid, "account": "codex1", "identity_sha256": IDENTITY,
                         "engine": call["engine"], "model": call["model"], "effort": call["effort"],
                         "controller_pid": before["pid"], "controller_birth": before["birth"],
                         "brain_home": HOME, "auth_target": AUTH, "brain_source": call["source"],
                         "native_sources": [t["source"] for t in traces]})
    coverage = audit["coverage"]
    p2 = audit["health"]["P2"]
    require(not coverage["issues"] and audit["indexed_counts"]["decisions"] > 0, "incomplete question coverage")
    require(p2["expected"] > 0 and p2["expected"] == p2["produced"] == p2["choices"]
            and p2["missing"] == p2["target_pending"] == 0, "missing actual P2 choice")
    require(coverage["independent_count"] > 0 and coverage["agreement"] is not None
            and coverage["agreement"] >= .95, "final P2/P3 group agreement below95% or unknown")
    return {"accepted": not issues, "issues": issues, "per_call_bindings": bindings,
            "segments": [{"account": "codex1", "engine": EXPECTED[0], "model": EXPECTED[1],
                          "effort": EXPECTED[2], "calls": len(calls), "first_ts": calls[0]["ts"],
                          "last_ts": calls[-1]["ts"]}] if calls else []}


def main(args):
    inputs = [args.audit, args.native, args.before, args.after, args.auth, args.identity]
    values = [json.loads(p.read_bytes()) for p in inputs]
    audit, native = values[:2]
    decisions, non_actions = [], []
    for ref in audit["source_refs"]:
        row = read_ref(ref)
        assert row["run_id"] == audit["run_id"]
        if ref["path"] == "logs/decisions.jsonl":
            if not row.get("decision_id"):
                assert row.get("label") == "map/route-change" and not row.get("questions") and not row.get("chosen")
                non_actions.append({"label": row["label"], "source": ref,
                                    "scope": "route-plan diagnostic row, not another model request or dispatched action"})
            decisions.append(row.get("decision_id") or f'{ref["path"]}@{ref["offset"]}')
    assert len(set(decisions)) == len(decisions) == audit["indexed_counts"]["decisions"]
    assert len(decisions) == audit["finished_rows"][0]["decisions"]
    all_traces = []
    trace_path = ROOT / "logs/codex-calls.jsonl"
    with trace_path.open("rb") as handle:
        while True:
            offset = handle.tell()
            raw = handle.readline()
            if not raw:
                break
            if audit["run_id"].encode() not in raw:
                continue
            assert raw.endswith(b"\n")
            row = json.loads(raw)
            if row.get("run_id") != audit["run_id"]:
                continue
            row = {k: row.get(k) for k in ["ts", "question_id", "model", "effort", "outcome", "thread_id", "turn_id"]}
            row["source"] = {"path": "logs/codex-calls.jsonl", "offset": offset, "bytes": len(raw), "sha256": sha(raw)}
            all_traces.append(row)
    result = inspect(*values, all_traces)
    assert result["accepted"], result["issues"]
    failures = []
    mutations = [
        ("alternate account target", lambda v, t: v[2]["auth_link"].update(target="/unknown/auth.json")),
        ("changed authentication inode", lambda v, t: v[4].update(target_inode=-1)),
        ("wrong controller", lambda v, t: v[2].update(pid=-1)),
        ("unknown native model", lambda v, t: t[0].update(model="unknown")),
        ("orphan physical request", lambda v, t: t.append({**t[0], "question_id": "unknown"})),
        ("missing P2 actual choice", lambda v, t: v[0]["health"]["P2"].update(choices=0)),
        ("C2 agreement below gate", lambda v, t: v[0]["coverage"].update(agreement=.94)),
        ("incomplete question coverage", lambda v, t: v[0]["coverage"].update(issues=[{"reason": "missing"}])),
    ]
    for name, mutate in mutations:
        changed, traces = deepcopy(values), deepcopy(all_traces)
        mutate(changed, traces)
        rejected = inspect(*changed, traces)
        assert not rejected["accepted"], name
        failures.append({"case": name, "rejected": True, "issues": rejected["issues"]})
    result.update({"at": datetime.now().astimezone().isoformat(), "run_id": audit["run_id"],
                   "parent": "roy-20261014-s-decision", "source_refs": [
                       {"path": str(p.relative_to(ROOT)), "sha256": sha(p.read_bytes())} for p in inputs],
                   "script_sha256": sha(Path(__file__).read_bytes()), "all_run_native_traces": all_traces,
                   "fixed_rejection_checks": failures, "decision_count": len(decisions),
                   "non_action_diagnostics": non_actions,
                   "account_binding_method": "Native question IDs bind every request to the one original PID; its live immutable environment selects codex1, verified account/read maps that home, and pre-start authentication inode/ctime plus unchanged terminal metadata exclude an intervening account change. Native request logs bind model/effort/thread/turn. No credentials read.",
                   "native_session_file_limit": "Runtime deletes its saved thread at controller exit. This audit uses immutable project native-request trace rows, not reconstructed native turn contexts or a claimed per-call account field.",
                   "automatic_switch_or_release": False})
    with args.output.open("x") as handle:
        handle.write(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"run_id": audit["run_id"], "accepted": result["accepted"],
                      "native_calls": len(result["per_call_bindings"]), "rejection_checks": len(failures)}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    for name in ["audit", "native", "before", "after", "auth", "identity", "output"]:
        parser.add_argument(name, type=lambda p: Path(p).resolve())
    main(parser.parse_args())
