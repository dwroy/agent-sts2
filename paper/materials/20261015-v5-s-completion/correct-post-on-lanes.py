"""Correct metadata lane classification using the original question label, without rerunning work."""
from datetime import datetime
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BASE = Path(__file__).resolve().parent / "on-RQCHNN0W72KF"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(path, value):
    with path.open("x") as handle:
        handle.write(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def main():
    original = BASE / "frozen-runtime"
    out = BASE / "frozen-runtime-r2"
    out.mkdir(exist_ok=False)
    script = Path(__file__).with_name("freeze-post-on-runtime.py")
    first = BASE / "freezer-first.py"
    first.write_bytes(script.read_bytes())
    old = '"lane": "b2" if sim.get("available") is True else "b3"'
    new = '"lane": "b2" if str(row.get("label", "")).startswith("combat/") else "b3"'
    text = script.read_text()
    assert text.count(old) == 1
    script.write_text(text.replace(old, new))
    refs = json.loads((original / "decision-byte-refs.json").read_bytes())
    attempts = {}
    for ref in refs:
        with (ROOT / ref["path"]).open("rb") as handle:
            handle.seek(ref["offset"])
            raw = handle.read(ref["bytes"])
        assert hashlib.sha256(raw).hexdigest() == ref["sha256"]
        row = json.loads(raw)
        completion = (row.get("boss_sim") or {}).get("completion") or {}
        if completion.get("required") is True:
            identity = completion["attempt_id"]
            assert identity not in attempts
            attempts[identity] = {"label": row["label"], "lane": "b2" if row["label"].startswith("combat/") else "b3", "source": ref}
    computations = json.loads((original / "post-on-computations.json").read_bytes())
    changes = []
    for item in computations:
        source = attempts[item["attempt_id"]]
        assert source["source"] == item["source"]
        if item["lane"] != source["lane"]:
            changes.append({"attempt_id": item["attempt_id"], "previous": item["lane"], **source})
        item["lane"] = source["lane"]
    save(out / "post-on-computations.json", computations)
    manifest = {"at": datetime.now().astimezone().isoformat(), "run_id": "RQCHNN0W72KF", "changes": changes,
                "reason": "available exists only on successful B2 results; failed combat/plan attempts must retain their original B2 lane. Original r1 inputs/reports remain unchanged.",
                "source": {"path": str(original / "runtime.json"), "sha256": sha(original / "runtime.json")},
                "correction_script": {"path": str(Path(__file__)), "sha256": sha(Path(__file__))},
                "first_freezer": {"path": str(first), "sha256": sha(first)},
                "corrected_freezer": {"path": str(script), "sha256": sha(script)},
                "no_query_simulation_api_or_production_change": True}
    save(out / "lane-correction.json", manifest)
    runtime = json.loads((original / "runtime.json").read_bytes())
    replacement = {item["attempt_id"]: item for item in computations}
    runtime["computations"] = [replacement.get(item["attempt_id"], item) for item in runtime["computations"]]
    runtime["at"] = manifest["at"]
    for name in ["lane-correction.json", "post-on-computations.json"]:
        runtime["source_refs"].append({"path": str(out / name), "sha256": sha(out / name)})
    runtime["coverage"]["metadata_correction"] = str(out / "lane-correction.json")
    save(out / "runtime.json", runtime)
    print(json.dumps({"corrected": len(changes), "attempts": len(computations), "lanes": {lane: sum(item["lane"] == lane for item in computations) for lane in ["b2", "b3"]}}))


if __name__ == "__main__":
    main()
