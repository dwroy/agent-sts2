"""Freeze the authorized study's inputs without interpreting game knowledge."""
from datetime import datetime
import hashlib
import json
import os
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
IDENT = "roy-20261010-silent-core-output-value"


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def complete_prefix_size(path):
    with path.open("rb") as stream:
        end = os.fstat(stream.fileno()).st_size
        start = max(0, end - 1048576)
        stream.seek(start)
        tail = stream.read(end - start)
    newline = tail.rfind(b"\n")
    if newline < 0:
        raise ValueError("No complete line in log tail: " + str(path))
    return start + newline + 1


def write_json(path, data):
    raw = (json.dumps(data, ensure_ascii=False, indent=2) + "\n").encode()
    with path.open("xb") as stream:
        stream.write(raw)
    return digest(raw)


if (HERE / "input-manifest.json").exists():
    raise SystemExit("Frozen input already exists; do not overwrite the original cutpoint")

logs = ROOT / "logs"
limits = {name: complete_prefix_size(logs / (name + ".jsonl")) for name in
          ("runs", "states", "decisions", "brain", "sl-attempts", "run-config", "codex-calls")}
with (logs / "runs.jsonl").open("rb") as stream:
    runs_raw = stream.read(limits["runs"])
inventory = []
for line in runs_raw.splitlines():
    row = json.loads(line)
    if str(row.get("character", "")).lower() != "silent" or not row.get("ended"):
        continue
    inventory.append({key: row.get(key) for key in
                      ("run_id", "ended", "ascension", "code", "victory", "floor")})
ids = [row["run_id"] for row in inventory]
if not ids or len(ids) != len(set(ids)) or any(not re.fullmatch(r"[A-Z0-9]{12}", run) for run in ids):
    raise ValueError("Ended role inventory has invalid or duplicate IDs")

artifacts = []
sources = [
    ("prior-core-report", "paper/materials/silent/20261010-core-reuse-value/prior-core-report.md", "prior-core-report.md"),
    ("prior-deck-size-report", "paper/materials/silent/20261010-core-reuse-value/prior-deck-size-report.md", "prior-deck-size-report.md"),
    ("prior-energy-reuse-report", "paper/materials/silent/20261010-core-reuse-value/result-review/report.md", "prior-energy-reuse-report.md"),
    ("experience-live-frozen", ".worktrees/live/knowledge/characters/silent/experience.json", "experience-live-frozen.json"),
]
for kind, source, name in sources:
    raw = (ROOT / source).read_bytes()
    with (HERE / name).open("xb") as stream:
        stream.write(raw)
    artifacts.append({"kind": kind, "path": str((HERE / name).relative_to(ROOT)),
                      "sha256": digest(raw), "source_path": source, "source_bytes": len(raw)})

lessons_path = ROOT / "notes/lessons.md"
with lessons_path.open("rb") as stream:
    end = os.fstat(stream.fileno()).st_size
    lesson_raw = stream.read(end)
lesson_raw = lesson_raw[:lesson_raw.rfind(b"\n") + 1]
lesson_sha = digest(lesson_raw)
original_dir = ROOT / "ops/codex-ops/core-output-originals"
original_dir.mkdir(parents=True, exist_ok=True)
original_path = original_dir / (lesson_sha + ".md")
if original_path.exists():
    if digest(original_path.read_bytes()) != lesson_sha:
        raise ValueError("Original snapshot hash mismatch")
else:
    with original_path.open("xb") as stream:
        stream.write(lesson_raw)
headers = list(re.finditer(rb"(?m)^## ([A-Z0-9]{12})(?:[^\n]*)", lesson_raw))
sections, selected = [], bytearray()
inventory_ids = set(ids)
for index, header in enumerate(headers):
    run = header.group(1).decode()
    if run not in inventory_ids:
        continue
    start = header.start()
    finish = headers[index + 1].start() if index + 1 < len(headers) else len(lesson_raw)
    raw = lesson_raw[start:finish]
    excerpt_start = len(selected)
    selected.extend(raw)
    sections.append({"run_id": run, "original_start": start, "original_end": finish,
                     "excerpt_start": excerpt_start, "excerpt_end": len(selected),
                     "sha256": digest(raw), "complete_section": index + 1 < len(headers)})
with (HERE / "lessons-silent-frozen.md").open("xb") as stream:
    stream.write(selected)
index_data = {"source": "notes/lessons.md", "original_frozen_path": str(original_path.relative_to(ROOT)),
              "original_bytes": len(lesson_raw), "original_sha256": lesson_sha,
              "sections": sections, "missing_run_ids": sorted(inventory_ids - {s["run_id"] for s in sections})}
index_sha = write_json(HERE / "lessons-index.json", index_data)
artifacts.append({"kind": "ended-silent-postmortems", "source_path": "notes/lessons.md",
                  "path": str((HERE / "lessons-silent-frozen.md").relative_to(ROOT)),
                  "sha256": digest(selected), "source_bytes": len(lesson_raw), "bytes": len(selected),
                  "index": str((HERE / "lessons-index.json").relative_to(ROOT)), "index_sha256": index_sha,
                  "original_frozen_path": str(original_path.relative_to(ROOT)), "original_frozen_sha256": lesson_sha,
                  "extraction": "Exact sections matching ended Silent inventory, original byte offsets and SHA in index",
                  "complete_line_prefix": True})

manifest = {
    "request_id": IDENT, "character": "silent", "frozen_at": datetime.now().astimezone().isoformat(),
    "runs": inventory, "run_count": len(ids), "dispatch_runs": ids[-10:],
    "dispatch_runs_are": "Entry anchors only; all frozen ended Silent runs are the research scope",
    "logs": str(logs), "log_byte_limits": limits, "runs_prefix_sha256": digest(runs_raw),
    "freeze_command": "nice -n 10 python3 paper/materials/silent/20261010-core-output-value/freeze-input.py",
    "frozen_artifacts": artifacts,
    "linked_prior_input": {"path": "paper/materials/silent/20261010-core-reuse-value/input-manifest.json",
                           "sha256": digest((ROOT / "paper/materials/silent/20261010-core-reuse-value/input-manifest.json").read_bytes())},
    "brain_source_status": "Learner must classify actual successful decisions with eval/brain_source.py; requested engines and legacy counters are not proof",
    "unknown": ["Whole-prefix hashes of large state/decision logs were not computed; hash actual extracted byte ranges",
                "Missing or final incomplete postmortems are identified in lessons-index.json; raw run evidence remains available",
                "Ops has established no causal damage benefit, fixed damage formula or universally stable A10 build"],
}
sha = write_json(HERE / "input-manifest.json", manifest)
print(json.dumps({"run_count": len(ids), "dispatch_runs": ids[-10:], "input_sha256": sha,
                  "missing_postmortems": index_data["missing_run_ids"]}, ensure_ascii=False))
