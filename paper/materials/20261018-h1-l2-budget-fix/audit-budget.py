#!/usr/bin/env python3
"""Frozen, read-only attribution of H1 deadlines. No model, game or simulation calls."""
import csv
import datetime as dt
import gzip
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(sys.argv[1]).resolve()
OUT = Path(__file__).resolve().parent
RUNS = ["25MFNPAE37R2", "2PQK67ULZY90", "4JS3T2UNKPVM", "WQB3YYNTRB2L", "BXU0CKWKH2RU", "J5E7A3MS9NSH"]
TOKENS = [r.encode() for r in RUNS]
cuts = {}
cut_path = OUT / "data-cut.json"
frozen_cuts = json.loads(cut_path.read_text()) if cut_path.exists() else {}


def rows(name):
    path = ROOT / "logs" / name
    limit = frozen_cuts.get(name, {}).get("source_size", path.stat().st_size)
    cuts[name] = {"path": str(path), "source_size": limit}
    with path.open("rb") as stream:
        while stream.tell() < limit:
            offset = stream.tell()
            raw = stream.readline()
            if offset + len(raw) > limit:
                break
            if not any(token in raw for token in TOKENS):
                continue
            try:
                value = json.loads(raw)
            except ValueError:
                continue
            if value.get("run_id", value.get("run")) not in RUNS:
                continue
            yield value, {"path": str(path), "offset": offset, "bytes": len(raw),
                          "sha256": hashlib.sha256(raw).hexdigest()}, raw


def when(value):
    return dt.datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()


brain = list(rows("brain.jsonl"))
decisions = list(rows("decisions.jsonl"))
shadow = list(rows("human-pace-shadow.jsonl"))
results = []
raw_failures = []
for call, source, raw in brain:
    candidates = [(abs(when(row["ts"]) - when(call["ts"])), row, ref, body)
                  for row, ref, body in decisions if row.get("run_id") == call["run_id"]
                  and row.get("label") == call["label"] and when(row["ts"]) >= when(call["ts"]) - .1]
    candidates.sort(key=lambda row: row[0])
    match = candidates[0] if candidates and candidates[0][0] < 15 else None
    if match is None:
        # A timed-out one-shot can dispatch its baseline under rest/choose or event/choose.
        candidates = [(when(row["ts"]) - when(call["ts"]), row, ref, body)
                      for row, ref, body in decisions if row.get("run_id") == call["run_id"]
                      and -.1 <= when(row["ts"]) - when(call["ts"]) < 15
                      and any(stage["stage"] == "L2_brain" and abs(stage["actual_ms"] - call.get("latency_ms", -10000)) < 20
                              for stage in row.get("time_budget", {}).get("stages", []))]
        candidates.sort(key=lambda row: row[0])
        match = candidates[0] if candidates else None
    # A standalone run-plan is recorded on the following real decision's shared entry.
    if match is None and call["label"] == "run-plan":
        candidates = [(when(row["ts"]) - when(call["ts"]), row, ref, body)
                      for row, ref, body in decisions if row.get("run_id") == call["run_id"]
                      and 0 <= when(row["ts"]) - when(call["ts"]) < 180]
        candidates.sort(key=lambda row: row[0])
        match = candidates[0] if candidates else None
    decision = match[1] if match else {}
    budget = decision.get("time_budget") or {}
    stages = [stage for stage in budget.get("stages", []) if stage["stage"] == "L2_brain"]
    # Multiple L2 calls may share an entry. Do not assign another call's allowance by proximity.
    stage = stages[0] if len(stages) == 1 else None
    if len(stages) > 1:
        related = [b for b, _, _ in brain if b["run_id"] == call["run_id"]
                   and when(decision.get("observed_ts", decision["ts"])) <= when(b["ts"]) <= when(decision["ts"])]
        related.sort(key=lambda b: when(b["ts"]))
        at = next((i for i, b in enumerate(related) if b.get("question_id") == call.get("question_id")), -1)
        if len(related) == len(stages) and at >= 0:
            stage = stages[at]
    b3 = decision.get("boss_sim") or {}
    g2 = b3.get("global_build") or {}
    p1 = b3.get("readiness") or {}
    construction = b3.get("construction") or {}
    sidecars = [s for s, _, _ in shadow if s.get("decision_id") == decision.get("decision_id") and decision.get("decision_id")]
    h2 = sum((s.get("direction", {}).get("time_budget", {}).get("actual_ms") or 0)
             + (s.get("card_facts", {}).get("time_budget", {}).get("actual_ms") or 0) for s in sidecars)
    jev = sum((s.get("jev_shadow", {}).get("latency_ms") or 0) for s in sidecars)
    before = stage.get("budget_ms") if stage else None
    row = {"run_id": call["run_id"], "question_id": call.get("question_id"), "label": call["label"],
           "ts": call["ts"], "floor": decision.get("floor"), "exhausted": "human-pace budget exhausted" in str(call.get("error", "")),
           "brain_latency_ms": call.get("latency_ms"), "before_L2_budget_ms": before, "after_L2_budget_ms": 90000,
           "before_shared_spent_ms": 90000 - before if before is not None else None,
           "B3_inclusive_ms": b3.get("ms"), "B3_sim_ms": b3.get("sim_ms"),
           "G2_shadow_ms": g2.get("wall_ms"), "B3_plus_G2_ms": g2.get("b3_plus_shadow_wall_ms"),
           "P1_shadow_ms_in_B3": p1.get("ms"), "P2_shadow_ms_in_B3": None,
           "construction_shadow_ms": construction.get("ms"),
           "H2_after_decision_ms": h2 if sidecars else None, "Jev_shadow_after_decision_ms": jev if sidecars else None,
           "H2_shared_budget_debit_ms": 0, "Jev_shadow_shared_budget_debit_ms": 0,
           "unassigned_shared_ms": None, "brain_source": source, "decision_source": match[2] if match else None,
           "old_stage": stage, "all_entry_stages": budget.get("stages", []),
           "actual_decision_label": decision.get("label"),
           "notes": ["B3 includes P1/P2 and common summarization; do not add those again.",
                     "P2 had no separate timer; unmeasured is unknown, not zero.",
                     "H2/Jev sidecar runs after this actual action/log, while parent budget is paused.",
                     "After=deterministic fixed-clock budget replay, not a new natural brain response."]}
    if before is not None and b3.get("ms") is not None:
        row["unassigned_shared_ms"] = 90000 - before - b3["ms"] - (g2.get("wall_ms") or 0) - (construction.get("ms") or 0)
    if row["exhausted"]:
        raw_failures.append({"brain": call, "brain_source": source, "decision": decision,
                             "decision_source": match[2] if match else None, "sidecar": sidecars})
    results.append(row)

OUT.mkdir(parents=True, exist_ok=True)
with gzip.open(OUT / "cutoff-originals.jsonl.gz", "wb") as stream:
    for row in raw_failures:
        stream.write((json.dumps(row, ensure_ascii=False) + "\n").encode())
report = {"schema": "h1-L2-budget-audit-v1", "at": dt.datetime.now().astimezone().isoformat(),
          "cuts": cuts, "counts": {run: {"L2": sum(r["run_id"] == run for r in results),
          "cutoffs": sum(r["run_id"] == run and r["exhausted"] for r in results)} for run in RUNS},
          "questions": results}
(OUT / "audit.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
if not cut_path.exists():
    cut_path.write_text(json.dumps(cuts, indent=2) + "\n")
columns = [key for key in results[0] if key not in ["brain_source", "decision_source", "old_stage", "all_entry_stages", "notes"]]
with (OUT / "per-question.csv").open("w", newline="") as stream:
    writer = csv.DictWriter(stream, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(results)
print(json.dumps({"counts": report["counts"], "cutoffs": [{key: r[key] for key in columns} for r in results if r["exhausted"]]}, ensure_ascii=False), flush=True)
