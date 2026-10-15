"""Add native-call cohort evidence to a frozen natural audit; never register admission."""
import argparse
from collections import Counter
from datetime import datetime
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
EXPECTED = ("codex", "gpt-6.1-sol", "xhigh")


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def read_ref(ref):
    path = ROOT / ref["path"]
    with path.open("rb") as handle:
        handle.seek(ref["offset"])
        raw = handle.read(ref["bytes"])
    assert raw.endswith(b"\n") and digest(raw) == ref["sha256"]
    return json.loads(raw)


def inspect(audit):
    run_id = audit["run_id"]
    calls = []
    for ref in audit["source_refs"]:
        if ref["path"] != "logs/brain.jsonl":
            continue
        row = read_ref(ref)
        assert row["run_id"] == run_id
        calls.append({key: row.get(key) for key in
                      ("ts", "question_id", "label", "engine", "model", "effort", "accepted", "attempts", "error_kind")})
        calls[-1]["dispatch_status"] = ("not_dispatched" if row.get("attempts") == 0
                                         and row.get("answer") is None and row.get("error_kind")
                                         else "requires_native_trace")
        calls[-1]["source"] = ref
    calls.sort(key=lambda row: (row["ts"], row["source"]["offset"]))
    question_ids = {row["question_id"] for row in calls if row["question_id"]}
    traces = []
    trace_path = ROOT / "logs/codex-calls.jsonl"
    with trace_path.open("rb") as handle:
        while True:
            offset = handle.tell()
            raw = handle.readline()
            if not raw:
                break
            if not raw.endswith(b"\n"):
                break
            if run_id.encode() not in raw:
                continue
            row = json.loads(raw)
            if row.get("run_id") != run_id or row.get("question_id") not in question_ids:
                continue
            trace = {key: row.get(key) for key in
                     ("ts", "question_id", "mode", "thread_id", "turn_id", "model", "effort", "outcome")}
            trace["source"] = {"path": "logs/codex-calls.jsonl", "offset": offset,
                               "bytes": len(raw), "sha256": digest(raw)}
            traces.append(trace)
    issues, segments = [], []
    for call in calls:
        if call["dispatch_status"] == "not_dispatched":
            call["trace_sources"] = []
            issues.append({"question_id": call["question_id"], "source": call["source"],
                           "reason": "zero_attempt_error_does_not_establish_model_consumption"})
            continue
        cohort = tuple(call[key] for key in ("engine", "model", "effort"))
        if not segments or tuple(segments[-1][key] for key in ("engine", "model", "effort")) != cohort:
            segments.append({"engine": cohort[0], "model": cohort[1], "effort": cohort[2],
                             "first_ts": call["ts"], "last_ts": call["ts"], "calls": 0})
        segments[-1]["last_ts"] = call["ts"]
        segments[-1]["calls"] += 1
        if cohort != EXPECTED:
            issues.append({"question_id": call["question_id"], "reason": "fallback_or_unknown_native_cohort",
                           "engine": cohort[0], "model": cohort[1], "effort": cohort[2]})
        if not call["question_id"]:
            issues.append({"source": call["source"], "reason": "missing_native_question_identity"})
            continue
        matched = [trace for trace in traces if trace["question_id"] == call["question_id"]
                   and datetime.fromisoformat(trace["ts"].replace("Z", "+00:00"))
                   <= datetime.fromisoformat(call["ts"].replace("Z", "+00:00"))]
        call["trace_sources"] = [trace["source"] for trace in matched]
        if call["engine"] == "codex":
            if not any(trace["outcome"] == "answered" for trace in matched):
                issues.append({"question_id": call["question_id"], "reason": "missing_answered_native_request_trace"})
            for trace in matched:
                if (trace["model"], trace["effort"]) != EXPECTED[1:]:
                    issues.append({"question_id": call["question_id"], "reason": "different_native_request_model_or_effort",
                                   "source": trace["source"]})
    return {"calls": calls, "segments": segments, "traces": traces, "issues": issues,
            "counts": dict(Counter((row["engine"] or "unknown") for row in calls)),
            "counts_scope": "Native brain log rows; zero-attempt errors are retained but are not model calls or consumers.",
            "not_dispatched": [row for row in calls if row["dispatch_status"] == "not_dispatched"],
            "all_native_calls_eligible": bool(calls) and not issues}


def main(audit_path, output, accounts):
    audit_raw = audit_path.read_bytes()
    audit = json.loads(audit_raw)
    result = inspect(audit)
    account_evidence = []
    for path in accounts:
        raw = path.read_bytes()
        value = json.loads(raw)
        assert value["run_id"] == audit["run_id"]
        account_evidence.append({"path": str(path.relative_to(ROOT)), "sha256": digest(raw), "evidence": value})
    value = {"at": datetime.now().astimezone().isoformat(), "run_id": audit["run_id"],
             "parent": "roy-20261014-s-decision", "expected": dict(zip(("engine", "model", "effort"), EXPECTED)),
             "audit_source": {"path": str(audit_path.relative_to(ROOT)), "sha256": digest(audit_raw)},
             "audit_script_sha256": digest(Path(__file__).read_bytes()), **result,
             "account_evidence": account_evidence,
             "whole_run_native_model_candidate": bool(audit["whole_run_candidate_for_review"]
                                                       and result["all_native_calls_eligible"]),
             "limits": "No admission or ACK. An ongoing run cannot qualify. Every fallback or unknown native model remains excluded. "
                       "Account readbacks are supporting evidence, not native per-call account fields; the owner must verify process, "
                       "brain-home and account continuity through the terminal window before accepting a whole run."}
    with output.open("x") as handle:
        handle.write(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"run_id": value["run_id"], "calls": len(result["calls"]), "issues": len(result["issues"]),
                      "whole_run_native_model_candidate": value["whole_run_native_model_candidate"]}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("audit", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--account-evidence", type=Path, action="append", default=[])
    args = parser.parse_args()
    main(args.audit.resolve(), args.output.resolve(), [path.resolve() for path in args.account_evidence])
