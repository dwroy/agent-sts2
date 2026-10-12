"""Audit frozen Silent extraction against log offsets and immutable parent inputs."""
import collections
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]


def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


previous = json.loads((HERE / "previous-trust.json").read_text())
parent = ROOT / "experiments/boss-sim/silent" / previous["refresh"]["artifact"]
completed = json.loads((parent / "completed.json").read_text())
for name, expected in completed["files_sha256"].items():
    assert sha(parent / name) == expected, name
fights = rows(HERE / "dataset/fights.jsonl")
runs = {r["run_id"]: r for r in rows(HERE / "dataset/runs-snapshot.jsonl")}
sources = rows(HERE / "dataset/sources.jsonl")
verified = []
with Path("/home/dw/Projects/agent-sts2/logs/states.jsonl").open("rb") as stream:
    for row in fights:
        run = runs[row["run_id"]]
        assert run["character"] == "SILENT" and run["ended"] and run["ascension"] == row["asc"]
        source = row["source"]
        stream.seek(source["t1_off"])
        raw = stream.read(source["t1_len"])
        assert hashlib.sha256(raw).hexdigest() == source["t1_sha256"]
        assert json.loads(raw)["state"] == row["t1"]["state"]
        assert row["outcome"] in ("won", "died")
        verified.append({"key": row["key"], "sha256": source["t1_sha256"], "resources_match": True})
old_keys = set(previous["refresh"]["keys"])
events = [r for r in rows(HERE / "dataset/sl-snapshot.jsonl")
          if r.get("run_id") in runs and runs[r["run_id"]].get("character") == "SILENT"
          and runs[r["run_id"]].get("ended") and r.get("fight_kind") == "boss"
          and r.get("result") in ("won", "died")
          and f"{r['run_id']}:{r['floor']}:{r['attempt']}:{r['ended_at']}" not in old_keys]
assert len(events) == 20
audit = {
    "character": "silent", "openings_verified": len(verified), "openings": verified,
    "parent_completed_files_verified": len(completed["files_sha256"]),
    "new_outcome_events": events,
    "f49_sources": [{k: r.get(k) for k in ("key", "run_id", "floor", "attempt", "outcome", "excluded", "code")}
                    for r in sources if r["floor"] == 49],
    "f49_actual_outcomes": sum(r["floor"] == 49 and r.get("outcome") in ("won", "died") for r in sources),
    "f49_usable": sum(r["floor"] == 49 for r in fights),
    "usable_by_asc": dict(collections.Counter(r["asc"] for r in fights)),
}
(HERE / "opening-source-integrity.json").write_text(json.dumps(audit, ensure_ascii=False, indent=1) + "\n")
print(json.dumps({k: v for k, v in audit.items() if k not in ("openings", "new_outcome_events", "f49_sources")}))
