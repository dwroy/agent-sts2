#!/usr/bin/env python3
"""Read bounded production logs; retain only non-secret metadata and digests."""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from collections import defaultdict
from pathlib import Path

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
ORIGINAL_CUTOFF = "2026-10-10T07:26:01.290Z"
CUTOFF = "2026-10-10T07:50:45.179Z"
RECORDED = "2026-10-10T15:54:15+08:00"
MERGE = "8e74493d92f757a88f15dffb48e2f5336c0cd0ac"
PUBLISHED = "2026-10-10T02:40:42+00:00"
LIMITS = {
    "run-config.jsonl": 1211188,
    "brain.jsonl": 377538218,
    "codex-calls.jsonl": 24369435,
}
POST = [
    "KDBWARERSGYW", "TFYU1MY8NEJ1", "49HL2N70CHMU", "F1TP5W6GF56Q",
    "EMRME965K74Q", "0DTPVHFXJ319", "JYTQSFJ96MG2", "DW8M3G2PV3N7",
    "675CHRV9HVQ3",
]
CROSS = "5BU7ZE1PWLSX"
IDS = POST + [CROSS]
CORE = [
    "silent-core-poison-defense-observation",
    "silent-core-dexterity-defense-observation",
    "silent-core-shiv-defense-observation",
    "silent-core-discard-relic-observation",
]


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def object_digest(value):
    return digest(json.dumps(value, ensure_ascii=False, sort_keys=True,
                             separators=(",", ":")).encode())


def extract():
    rows = {name: [] for name in LIMITS}
    provenance = {}
    for name, limit in LIMITS.items():
        path = ROOT / "logs" / name
        assert path.stat().st_size >= limit
        sha = hashlib.sha256()
        off = 0
        with path.open("rb") as handle:
            while off < limit:
                line = handle.readline(limit - off)
                start = off
                off += len(line)
                sha.update(line)
                assert line.endswith(b"\n"), (name, start)
                if not any(rid.encode() in line for rid in IDS):
                    continue
                row = json.loads(line)
                if row.get("run_id") not in IDS or row.get("ts", "") > CUTOFF:
                    continue
                meta = {"run_id": row["run_id"], "ts": row["ts"],
                        "offset": start, "length": len(line),
                        "line_sha256": digest(line)}
                if name == "run-config.jsonl":
                    meta.update({key: row.get(key) for key in
                                 ["restart", "process", "code", "knowledge"]})
                elif name == "brain.jsonl":
                    meta.update({key: row.get(key) for key in
                                 ["question_id", "engine", "label", "knowledge",
                                  "system_sha", "system_chars", "accepted"]})
                    # Absence of an explicit ID citation does not imply non-use.
                    answer = json.dumps(row.get("answer"), ensure_ascii=False)
                    meta["explicit_core_ids_in_answer"] = [item for item in CORE if item in answer]
                else:
                    meta.update({key: row.get(key) for key in
                                 ["question_id", "outcome", "cache_request"]})
                rows[name].append(meta)
        provenance[name] = {"path": f"logs/{name}", "frozen_bytes": limit,
                            "prefix_sha256": sha.hexdigest(), "selected": len(rows[name])}

    baseline = {row["id"]: row for row in json.loads(
        (ROOT / "paper/materials/silent/20261010-core-experience-publication/entries.json").read_text())}
    assert set(baseline) == set(CORE)
    commits = sorted({row["code"]["commit"] for row in rows["run-config.jsonl"]})
    versions = []
    for commit in commits:
        raw = subprocess.check_output([
            "git", "show", f"{commit}:knowledge/characters/silent/experience.json"], cwd=ROOT)
        data = json.loads(raw)
        lookup = {row["id"]: row for row in data["entries"]}
        versions.append({"commit": commit, "experience_version": data["version"],
                         "experience_blob_sha256": digest(raw),
                         "core_entries": [{"id": item, "present": item in lookup,
                                          "equals_published_entry": lookup.get(item) == baseline[item],
                                          "normalized_entry_sha256": object_digest(lookup[item])
                                          if item in lookup else None}
                                         for item in CORE]})
    code_paths = [
        "agent/src/brain/knowledge.ts", "agent/src/knowledge/render/data.ts",
        "agent/src/knowledge/render/experience-text.ts", "agent/src/brain/router.ts",
        "agent/src/brain/engines/codex-cache.ts", "agent/src/eye/run-config.ts",
    ]
    return {"recorded_at": RECORDED, "finished_cutoff": CUTOFF,
            "original_finished_cutoff": ORIGINAL_CUTOFF,
            "publish_commit": MERGE, "publish_commit_time": PUBLISHED,
            "core_ids": CORE, "provenance": provenance, "rows": rows,
            "startup_commit_experience_verification": versions,
            "implementation_sha256": {path: digest((ROOT / path).read_bytes()) for path in code_paths}}


def analyze(evidence):
    configs = {row["run_id"]: row for row in evidence["rows"]["run-config.jsonl"]}
    calls = defaultdict(list)
    for row in evidence["rows"]["codex-calls.jsonl"]:
        calls[row["question_id"]].append(row)
    brains = defaultdict(list)
    for row in evidence["rows"]["brain.jsonl"]:
        brains[row["run_id"]].append(row)
    version_lookup = {row["commit"]: row for row in evidence["startup_commit_experience_verification"]}
    result = []
    for rid in IDS:
        config = configs[rid]
        data = brains[rid]
        first = data[0]
        assert first["knowledge"]["prefix_sha"] == config["knowledge"]["prefix_sha"]
        assert first["system_sha"] == config["knowledge"]["system_sha"]
        matches = 0
        groups = defaultdict(list)
        for row in data:
            groups[row["knowledge"]["prefix_sha"]].append(row)
            matching = [call for call in calls[row["question_id"]]
                        if (call.get("cache_request") or {}).get("instructions", {}).get(
                            "sha256", "").startswith(row["system_sha"])]
            assert matching, row["question_id"]
            matches += 1
        if rid in POST:
            assert all(row["equals_published_entry"] for row in
                       version_lookup[config["code"]["commit"]]["core_entries"])
        else:
            assert len(groups) == 1 and config["knowledge"]["experience_version"] == "2026-10-10.4"
        result.append({
            "run_id": rid, "cohort": "fully_post_release" if rid in POST else "crossing_without_post_release_question",
            "process_started": config["process"]["started"], "config_ts": config["ts"],
            "experience_version": config["knowledge"]["experience_version"],
            "config_commit": config["code"]["commit"], "questions": len(data),
            "full_prefix_questions": sum(row["knowledge"]["mode"] == "full" for row in data),
            "accepted_questions": sum(row["accepted"] is True for row in data),
            "actual_client_instructions_digest_matches": matches,
            "explicit_core_id_answer_citations": sum(bool(row["explicit_core_ids_in_answer"]) for row in data),
            "prefix_groups": [{"prefix_sha": sha, "questions": len(values),
                               "first": values[0]["ts"], "last": values[-1]["ts"]}
                              for sha, values in groups.items()],
        })
    return {"recorded_at": RECORDED, "finished_cutoff": CUTOFF,
            "original_finished_cutoff": ORIGINAL_CUTOFF,
            "original_post_release_runs": 8,
            "original_post_release_questions": sum(row["questions"] for row in result if row["run_id"] in POST[:-1]),
            "post_release_runs": len(POST),
            "post_release_questions": sum(row["questions"] for row in result if row["run_id"] in POST),
            "runs": result,
            "limits": [
                "The archived full-prefix publication render proves all four entries were available. Startup experience versions and their Git blobs preserve each entry unchanged.",
                "brain.jsonl logs full-prefix and system digests, not the complete system text. codex-calls.cache_request.instructions measures the actual client instructions; all selected question digests agree.",
                "Runtime prefix regeneration tracks knowledge and lessons mtime/size, so a process can receive changed knowledge mid-run. Startup code commits alone cannot establish each question's exact full prefix bytes.",
                "No selected answer explicitly names a four-core experience ID. Its archetype wording cannot establish which individual entry caused the decision; older knowledge already contains overlapping topics.",
                "Exposure to knowledge, explicit adoption, and performance benefit are distinct. This receipt proves actual full-prefix client exposure with startup provenance, not causal adoption or benefit.",
                "The 5BU crossing run has 32 old-prefix questions, all before the live merge; exclude it from a fully post-release cohort.",
            ]}


def write(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--replay", action="store_true")
    args = parser.parse_args()
    if args.replay:
        evidence = json.loads((OUT / "evidence.json").read_text())
    else:
        assert not (OUT / "evidence.json").exists(), "Preserve existing evidence; use --replay"
        evidence = extract()
        write("evidence.json", evidence)
    summary = analyze(evidence)
    write("summary.json", summary)
    write("manifest.json", {"recorded_at": RECORDED, "no_behavior_or_state_mutation": True,
                            "files": {name: {"sha256": digest((OUT / name).read_bytes()),
                                             "bytes": (OUT / name).stat().st_size}
                                      for name in ["extract.py", "evidence.json", "summary.json"]},
                            "command": f"nice -n 19 python3 {OUT.relative_to(ROOT)}/extract.py",
                            "replay_command": f"nice -n 19 python3 {OUT.relative_to(ROOT)}/extract.py --replay"})
    print(json.dumps({"post_release_runs": summary["post_release_runs"],
                      "post_release_questions": summary["post_release_questions"],
                      "summary_sha256": digest((OUT / "summary.json").read_bytes())}))
