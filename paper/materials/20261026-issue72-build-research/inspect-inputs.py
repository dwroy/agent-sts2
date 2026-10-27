"""Read frozen repository receipts and original research artifacts, never the player database."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

BASE = "16f66e76ad49e65df75a2efd88685b56fb86294d"
MAP = "paper/materials/20261025-issue51-global-ops/A-playbook-to-formal-map.json"


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repository", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--fragments-output", type=Path)
    args = parser.parse_args()
    repo = args.repository.resolve()
    raw = subprocess.run(["git", "show", BASE + ":" + MAP], check=True, capture_output=True).stdout
    mapping = json.loads(raw)
    result = {"base": BASE, "mapping": {"path": MAP, "sha256": sha(raw)},
              "historical_knowledge_version": mapping["knowledge_version"], "units": [],
              "published_now_claimed": False, "production_db_opened": False,
              "automatic_promotion": False}
    for unit in mapping["units"]:
        artifacts = []
        for artifact in unit["original_artifacts"]:
            path = repo / artifact["path"]
            row = {"path": artifact["path"], "expected_sha256": artifact["sha256"]}
            if path.is_file() and not path.is_symlink():
                content = path.read_bytes()
                row.update(sha256=sha(content), bytes=len(content), matches_frozen=sha(content) == artifact["sha256"])
            else:
                row["available_at_original_path"] = False
            artifacts.append(row)
        result["units"].append({"plan": unit["plan"], "batch": unit["batch"], "artifacts": artifacts,
                                "original_source_binding": {k: unit["original_binding"].get(k) for k in
                                                            ("request_id", "plan_id", "source", "input_manifest", "work_spec", "provenance")},
                                "original_cohorts_separate": [{k: c.get(k) for k in
                                                               ("version", "sample_count", "sample_denominator", "collected_at", "contains_player_identifiers")}
                                                              for c in unit["original_binding"].get("cohorts", [])],
                                "destinations": [{"id": d["id"], "original_disposition": d.get("original_disposition"),
                                                  "disposition_now": d.get("disposition_now"),
                                                  "original_candidate_objects": d.get("original_candidate_objects"),
                                                  "formal_in_historical_version": [{k: r.get(k) for k in
                                                    ("type", "id", "revision", "payload_sha256", "version", "source", "confidence", "first_existing_release_for_revision")}
                                                   for r in d.get("formal_current", [])]}
                                                 for d in unit["destinations"]],
                                "interpretation": "original mapping only; published fragments do not publish the whole research"})
    candidate = Path(".worktrees/codex-strategy-silent-20261025-231305/learner/runs/"
                     "20261025-231321-ee5adb8f-3123-4b8a-9ea9-3d697b133b66-strategy-proposal/"
                     "scratch/playbook-candidate.json")
    raw = (repo / candidate).read_bytes()
    original = json.loads(raw)
    result["successor"] = {"path": str(candidate), "sha256": sha(raw), "bytes": len(raw),
                           "id": original["id"], "source": original["source"], "version": original["version"],
                           "input_sha256": original["input_sha256"], "selected_uploads": original["selected_uploads"],
                           "players": original["players"], "verified_complete_playbook": original["verified_complete_playbook"],
                           "formal_publication": original["formal_publication"], "consumer_readback": original["consumer_readback"],
                           "phases": [{"id": p["id"], "original_fields": list(p), "strategy_ids": p["strategy_ids"], "rk_ids": p["rk_ids"]} for p in original["phases"]],
                           "limitations_count": len(original["limitations"]),
                           "interpretation": "source/schema inspection only; raw content remains with original owner"}
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    if args.fragments_output:
        # This is an already-published, explicitly named immutable snapshot, never latest or a writable DB.
        version = "K1-a32ba7010ced9ce11665b63d79dcbe8a52192b613cb70a629782d7775161d75e"
        snapshot = repo / "data/knowledge-runtime/snapshots" / version
        manifest_raw = (snapshot / "manifest.json").read_bytes()
        manifest = json.loads(manifest_raw)
        if manifest["version"] != version:
            raise ValueError("published snapshot identity mismatch")
        leaves, by_id = [], {}
        for filename, kind in (("experience.json", "experience"), ("strategy-entries.json", "strategy"), ("reflex.json", "reflex")):
            relative = "characters/silent/" + filename
            content = (snapshot / relative).read_bytes()
            if sha(content) != manifest["files"][relative]:
                raise ValueError("published snapshot checksum mismatch")
            leaves.append({"path": relative, "sha256": sha(content), "bytes": len(content)})
            for item in json.loads(content)["entries"]:
                canonical = json.dumps(item, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
                by_id.setdefault(item["id"], []).append({"type": kind, "id": item["id"], "path": relative,
                                                        "canonical_sha256": sha(canonical.encode()),
                                                        "source": item.get("source"), "confidence": item.get("confidence"),
                                                        "evidence_status": item.get("evidence_status", "unassessed"),
                                                        "version": item.get("version")})
        fragment_result = {"version": version, "manifest_sha256": sha(manifest_raw), "leaves": leaves,
                           "entry_digest_algorithm": "Python sorted-key compact UTF-8 JSON; an inventory digest, not K1 revision or classificationDigest",
                           "basis": "explicit published 231305 snapshot plus original publication receipts; not current-pointer or natural-adoption proof",
                           "units": [{"plan": u["plan"], "batch": u["batch"],
                                      "destinations": [{"id": d["id"], "published": by_id.get(d["id"], [])} for d in u["destinations"]]}
                                     for u in mapping["units"]],
                           "successor": {"id": original["id"], "published_whole": by_id.get(original["id"], []),
                                         "phases": [{"id": p["id"], "strategy": [{"id": ident, "published": by_id.get(ident, [])} for ident in p["strategy_ids"]],
                                                     "reflex": [{"id": ident, "published": by_id.get(ident, [])} for ident in p["rk_ids"]]}
                                                    for p in original["phases"]]},
                           "production_db_opened": False, "automatic_promotion": False}
        args.fragments_output.write_text(json.dumps(fragment_result, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
