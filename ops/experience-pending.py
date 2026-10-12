#!/usr/bin/env python3
"""Run ids whose post-mortem (notes/lessons.md "## <run id>") is not yet folded into the experience library.

Folded = cited as evidence / contradicting in the run worktree's experience.json, or named in
paper/materials/experience-changelog.md. Oldest first (the order lessons.md lists them).
Roy 2026-10-03: the learner folds them in every 10 post-mortems (experience-update task).

Per character (multi-character, 2026-10-04): each character has its own library
(knowledge/characters/<id>/experience.json), and a post-mortem is pending for the character of its run (logs/runs.jsonl
`character`; a run not listed there, or listed without one, is the Ironclad's: every run before the Silent).
--character ID (default: the CHARACTER environment variable, else ironclad, the one library before the split) picks it.

  python3 ops/experience-pending.py                      # count, then the ids comma-separated (the Ironclad's)
  python3 ops/experience-pending.py --max 30             # at most 30 ids (the oldest)
  python3 ops/experience-pending.py --character silent   # the Silent's (no library yet: every Silent post-mortem)
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import LIVE, LOGS, ROOT  # noqa: E402
sys.path.insert(0, os.path.join(ROOT, "knowledge", "builders"))
from characters import LEGACY, character_key, env_character, run_character  # noqa: E402
limit = None
if "--max" in sys.argv:
    limit = int(sys.argv[sys.argv.index("--max") + 1])
character = env_character() or LEGACY
if "--character" in sys.argv:
    character = character_key(sys.argv[sys.argv.index("--character") + 1]) or LEGACY
lessons = open(os.path.join(ROOT, "notes/lessons.md"), encoding="utf8").read()
# Runs listed inside <!-- --> have no post-mortem (the pre-learning-loop A0 runs).
lessons = re.sub(r"<!--.*?-->", "", lessons, flags=re.S)
ids = list(dict.fromkeys(re.findall(r"^## ([0-9A-Z]{12})", lessons, re.M)))
# The character of each listed run (runs.jsonl); unlisted: the Ironclad's.
of = {}
runs_path = os.path.join(LOGS, "runs.jsonl")
if os.path.exists(runs_path):
    for line in open(runs_path, encoding="utf8"):
        try:
            row = json.loads(line)
        except ValueError:
            continue
        if isinstance(row, dict) and row.get("run_id"):
            of[row["run_id"]] = run_character(row)
ids = [run for run in ids if of.get(run, LEGACY) == character]
folded = set()
library = os.path.join(LIVE, f"knowledge/characters/{character}/experience.json")
# A character without a library yet (the Silent before its first fold): nothing folded.
exp = json.load(open(library, encoding="utf8")) if character == LEGACY or os.path.exists(library) else {"entries": []}
for entry in exp["entries"]:
    folded.update(entry.get("evidence") or [])
    folded.update(entry.get("contradicting") or [])
# One changelog per character (Roy 2026-10-04): the Ironclad's as before, another's experience-changelog-<id>.md.
changelog = os.path.join(ROOT, "paper/materials/experience-changelog.md" if character == LEGACY else f"paper/materials/experience-changelog-{character}.md")
if os.path.exists(changelog):
    folded.update(re.findall(r"[0-9A-Z]{12}", open(changelog, encoding="utf8").read()))
pending = [run for run in ids if run not in folded]
print(len(pending))
print(",".join(pending[:limit] if limit else pending))
