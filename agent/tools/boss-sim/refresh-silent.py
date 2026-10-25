#!/usr/bin/env python3
"""Offline, idempotent Silent calibration artifacts; publishing uses the learner's locked live workflow."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(ROOT / "ops"))
from content_store import Store, default_directory
from character_extract import extract, read_jsonl
from silent_calibration import cadence, frozen_split, render
from report import load


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def model_fingerprint(root, game_data):
    paths = sorted((root / "agent/src").rglob("*.ts"))
    paths += sorted(p for p in (root / "agent/tools/boss-sim").iterdir()
                    if p.suffix in (".ts", ".py") and not p.name.startswith("test_"))
    paths += sorted((root / "knowledge/common").glob("*.json"))
    paths += sorted(p for p in (root / "knowledge/characters/silent").glob("*.json") if p.name != "boss-trust.json")
    # New frozen producers must remain restorable without borrowing a mutable helper.
    if (root / "ops/content_store.py").is_file():
        paths += [root / "ops/content_store.py"]
    paths += [game_data]
    return {str(p.relative_to(root)) if p.is_relative_to(root) else str(p): digest(p) for p in paths}


def write_json(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=1) + "\n", encoding="utf8")


def synchronize(archive, args):
    for source, target in (("boss-trust.json", args.out), ("report.md", args.report)):
        if target:
            Path(target).parent.mkdir(parents=True, exist_ok=True)
            Path(target).write_bytes((archive / source).read_bytes())


def seal_archive(archive, store_directory):
    """Deduplicate completed inputs/results, preserving every existing reuse check."""
    store = Store(store_directory)
    records = {str(path.relative_to(archive)): store.publish_view(path, path)
               for path in sorted(archive.rglob("*")) if path.is_file() and path.suffix in (".json", ".jsonl")}
    write_json(archive.with_suffix(".content.json"), {"schema": "frozen-simulation-artifacts-v1",
               "artifact": archive.name, "files": records,
               "reuse_contract": "original provenance, split, input/hash/seed/control checks unchanged"})


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--scratch", required=True)
    p.add_argument("--logs", required=True)
    p.add_argument("--db", required=True)
    p.add_argument("--game-data", required=True)
    p.add_argument("--previous", help="published Silent boss-trust.json; freezes the cutoff/tune keys")
    p.add_argument("--dataset", help="already frozen extraction directory")
    p.add_argument("--results", help="already computed fixed results glob")
    p.add_argument("--provenance", help="already recorded immutable simulation provenance")
    p.add_argument("--out", help="generated Silent trust output (never writes other characters)")
    p.add_argument("--report", help="generated report path")
    p.add_argument("--force", action="store_true", help="rerun unchanged trigger; does not move the split")
    p.add_argument("--object-store", help="immutable input/result object directory; default shared by repository worktrees")
    args = p.parse_args(argv)
    # Only a newly registered runtime batch can take this path; legacy/manual
    # calibrations retain their original publication contract.
    if os.environ.get("LEARNER_BATCH_ID") and os.environ.get("LEARNER_STATE_FILE") and not os.environ.get("STS2_FIXED_DATA_LEASE"):
        batch_id = os.environ["LEARNER_BATCH_ID"]
        batch = json.loads(Path(os.environ["LEARNER_STATE_FILE"]).read_text())["batches"][batch_id]
        selected = batch.get("operational_runtime", {})
        if selected.get("enabled") and "silent-boss-calibration" in selected.get("entries", []):
            if batch.get("learner_task") != "silent-boss-calibration" or batch.get("character") != "silent" or batch.get("state") != "running":
                raise ValueError("fixed calibration requires its original running batch")
            from learning_runtime_data import refresh_step
            from learning_runtime import selection
            chosen = selection(selected["root"], batch)
            target_root = Path(batch["worktree"])
            owner_root = Path(selected["root"])
            if not target_root.is_absolute() or target_root.resolve() != target_root or target_root != owner_root and target_root.parent != owner_root / ".worktrees":
                raise ValueError("fixed calibration output lost original worktree binding")
            original_output = os.environ.get("STS2_FIXED_DATA_OUTPUT_ROOT")
            try:
                os.environ["STS2_FIXED_DATA_OUTPUT_ROOT"] = str(target_root)
                with refresh_step(selected["root"], target_root, "silent-boss-calibration", ["silent"], batch_id + ":calibration", chosen_override=chosen, method_root=ROOT) as receipt:
                    code = 0 if receipt.get("already_completed") else main(argv)
                    receipt["rc"] = code
            finally:
                if original_output is None:
                    os.environ.pop("STS2_FIXED_DATA_OUTPUT_ROOT", None)
                else:
                    os.environ["STS2_FIXED_DATA_OUTPUT_ROOT"] = original_output
            print(json.dumps({"fixed_data": receipt}))
            return code
    scratch = Path(args.scratch).resolve()
    scratch.mkdir(parents=True, exist_ok=True)
    previous = json.loads(Path(args.previous).read_text()) if args.previous else None
    if previous and previous.get("character") != "silent":
        p.error("previous calibration must be Silent's")
    c = cadence(read_jsonl(Path(args.logs) / "runs.jsonl"), read_jsonl(Path(args.logs) / "sl-attempts.jsonl"),
                previous.get("refresh") if previous else None)
    if not c["due"] and not args.force:
        print(json.dumps({"skipped": "threshold not reached", "new": c["new_completed_boss_attempts"]}))
        return 0
    if args.out:
        target = Path(args.out).resolve()
        output_root = Path(os.environ.get("STS2_FIXED_DATA_OUTPUT_ROOT") or ROOT)
        for at in range(len(target.parts)):
            if target.parts[at] == "knowledge" and (target.parts[at + 1:] != ("characters", "silent", "boss-trust.json")
                                                   or not target.is_relative_to(output_root / "knowledge")):
                p.error("only the Silent boss-trust artifact can be synchronized")
    dataset = Path(args.dataset) if args.dataset else scratch / "dataset"
    if not args.dataset:
        extract(args.logs, args.db, dataset, ascensions=range(max(10, c["max_asc"]) + 1))
    # Count exactly the finished runs/events in the extraction snapshot, not later appends to live logs.
    c = cadence(read_jsonl(dataset / "runs-snapshot.jsonl"), read_jsonl(dataset / "sl-snapshot.jsonl"),
                previous.get("refresh") if previous else None)
    if not c["due"] and not args.force:
        print(json.dumps({"skipped": "frozen snapshot threshold not reached", "new": c["new_completed_boss_attempts"]}))
        return 0
    fights = read_jsonl(dataset / "fights.jsonl")
    split_data = frozen_split(fights, previous.get("split") if previous else None)
    versions = {side: sorted({r.get("code") for r in fights if r["key"] in set(split_data[side])}) for side in ("tune", "val")}
    automatic_extension = previous and not args.results and not args.provenance
    if automatic_extension:
        from pinned_silent import extend
        args.results, args.provenance = extend(ROOT, scratch, dataset, fights, previous, Path(args.game_data).resolve())
    if args.provenance:
        provenance = json.loads(Path(args.provenance).read_text())
    else:
        fingerprints = model_fingerprint(ROOT, Path(args.game_data))
        provenance = {"simulator_base": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
                      "model_sha256": hashlib.sha256(json.dumps(fingerprints, sort_keys=True).encode()).hexdigest(),
                      "input_files": fingerprints, "samples": 200, "seed": 1}
    provenance.update({"dataset_sha256": digest(dataset / "fights.jsonl"), "sources_sha256": digest(dataset / "sources.jsonl"),
                       "versions": versions, "completed_max_asc": c["max_asc"]})
    identity = hashlib.sha256(json.dumps({"source": provenance, "split": split_data}, sort_keys=True).encode()).hexdigest()
    archive = scratch / identity
    archive.mkdir(exist_ok=True)
    if (archive / "completed.json").exists():
        completed = json.loads((archive / "completed.json").read_text())
        if digest(archive / "boss-trust.json") != completed["trust_sha256"] or digest(archive / "report.md") != completed["report_sha256"]:
            raise RuntimeError("completed archive changed; do not publish corrupted artifacts")
        if any(digest(archive / name) != value for name, value in completed.get("files_sha256", {}).items()):
            raise RuntimeError("completed sources/results changed; retain and investigate before publishing")
        seal_archive(archive, args.object_store or default_directory(scratch))
        synchronize(archive, args)
        print(json.dumps({"skipped": "identical artifact already complete", "archive": str(archive)}))
        return 0
    write_json(archive / "split.json", split_data)
    write_json(archive / "provenance.json", provenance)
    result_glob = args.results
    if not result_glob:
        result_dir = archive / "results"
        env = {**os.environ, "CHARACTER": "silent", "TMPDIR": str(scratch)}
        cmd = ["node", "--import", "tsx", "tools/boss-sim/backtest.ts", "--character", "silent", "--game-data", args.game_data,
               "--in", str(dataset / "fights.jsonl"), "--out-dir", str(result_dir), "--samples", "200", "--starts", "t1,pre", "--no-rollout"]
        # One Node + its transpiler and this coordinator: at most four OS processes, inherited nice priority.
        with (archive / "backtest.log").open("w") as log:
            result = subprocess.run(["nice", "-n", "19", *cmd], cwd=ROOT / "agent", env=env, stdout=log, stderr=subprocess.STDOUT)
        if result.returncode:
            return result.returncode
        if model_fingerprint(ROOT, Path(args.game_data)) != provenance["input_files"]:
            raise RuntimeError("model changed during replay; retain incomplete archive, do not publish")
        result_glob = str(result_dir / "results-*.jsonl")
    results = load(result_glob)
    expected = {(r["key"], start) for r in fights for start in ("t1", "pre")}
    if {(r["key"], r["start"]) for r in results} != expected:
        raise RuntimeError("incomplete or foreign result set")
    trust_path = archive / "boss-trust.json"
    cmd = [sys.executable, str(HERE / "trust.py"), "--character", "silent", "--results", result_glob,
           "--fights", str(dataset / "fights.jsonl"), "--split", str(archive / "split.json"), "--turns", str(dataset / "turns.jsonl"),
           "--provenance", str(archive / "provenance.json"), "--out", str(trust_path)]
    result = subprocess.run(cmd, check=False)
    if result.returncode:
        return result.returncode
    data = json.loads(trust_path.read_text())
    if previous and provenance.get("model_sha256") == previous["source"].get("model_sha256"):
        for start in ("t1", "pre"):
            if data["overall"][start]["platt"] != previous["overall"][start]["platt"] or data["selection"][start] != previous["selection"][start]:
                raise RuntimeError("fixed-model tuning changed; retain evidence, do not publish")
    data["refresh"] = {**c, "due": False, "artifact": identity, "rule": "ascension or 20 new actual-outcome boss attempts; scheduler tick at :13/:43 and learner finish events"}
    write_json(trust_path, data)
    sources = read_jsonl(dataset / "sources.jsonl")
    extraction = json.loads((dataset / "extraction.json").read_text())
    report = render(data, sources, extraction)
    (archive / "report.md").write_text(report, encoding="utf8")
    # Raw/log sources stay immutable; retain compact reproducible inputs/results with each report.
    for name in ("fights.jsonl", "sources.jsonl", "turns.jsonl", "extraction.json"):
        (archive / name).write_bytes((dataset / name).read_bytes())
    if automatic_extension:
        for name in ("opening-audit.json", "model-input-audit.json", "corrected-opening-keys.json", "replay-keys.json"):
            (archive / name).write_bytes((scratch / "pinned-extension" / name).read_bytes())
    # Archive only this character's metadata; the original log-prefix hashes stay in extraction.json.
    run_rows = [r for r in read_jsonl(dataset / "runs-snapshot.jsonl") if r.get("character") == "SILENT" and r.get("ended")]
    ids = set(extraction.get("eligible_run_ids", [r["run_id"] for r in run_rows]))
    run_rows = [r for r in run_rows if r["run_id"] in ids]
    sl_rows = [r for r in read_jsonl(dataset / "sl-snapshot.jsonl") if r.get("run_id") in ids and r.get("fight_kind") == "boss"]
    for name, rows in (("runs-snapshot.jsonl", run_rows), ("sl-snapshot.jsonl", sl_rows)):
        (archive / name).write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf8")
    (archive / "results.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in results), encoding="utf8")
    synchronize(archive, args)
    write_json(archive / "completed.json", {"artifact": identity, "trust_sha256": digest(trust_path), "report_sha256": digest(archive / "report.md"),
               "files_sha256": {path.name: digest(path) for path in archive.iterdir() if path.is_file() and path.name != "completed.json"}})
    seal_archive(archive, args.object_store or default_directory(scratch))
    print(json.dumps({"archive": str(archive), "artifact": identity, "trusted_b2": data["trusted_b2"], "trusted_b3": data["trusted_b3"]}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
