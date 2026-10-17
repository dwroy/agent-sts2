#!/usr/bin/env python3
"""Add a pre-existing construction timer by verified raw offsets, without rescanning live logs."""
import csv
import hashlib
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent
path = OUT / "audit.json"
value = json.loads(path.read_text())
for row in value["questions"]:
    ref = row["decision_source"]
    with Path(ref["path"]).open("rb") as stream:
        stream.seek(ref["offset"])
        raw = stream.read(ref["bytes"])
    assert hashlib.sha256(raw).hexdigest() == ref["sha256"]
    decision = json.loads(raw)
    b3 = decision.get("boss_sim") or {}
    construction = (b3.get("construction") or {}).get("ms")
    row["construction_shadow_ms"] = construction
    if row["before_L2_budget_ms"] is not None and b3.get("ms") is not None:
        row["unassigned_shared_ms"] = 90000 - row["before_L2_budget_ms"] - b3["ms"] - (row["G2_shadow_ms"] or 0) - (construction or 0)
path.rename(OUT / "audit-r2.json")
path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
csv_path = OUT / "per-question.csv"
csv_path.rename(OUT / "per-question-r2.csv")
columns = [key for key in value["questions"][0] if key not in ["brain_source", "decision_source", "old_stage", "all_entry_stages", "notes"]]
with csv_path.open("w", newline="") as stream:
    writer = csv.DictWriter(stream, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(value["questions"])
print(json.dumps({"questions": len(value["questions"]), "cutoffs": sum(r["exhausted"] for r in value["questions"]),
                  "unassigned_cutoff_ms": [round(r["unassigned_shared_ms"], 3) if r["unassigned_shared_ms"] is not None else None
                                           for r in value["questions"] if r["exhausted"]]}))
