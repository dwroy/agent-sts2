#!/usr/bin/env python3
"""Run ids whose post-mortem (notes/lessons.md "## <run id>") is not yet folded into the experience library.

Folded = cited as evidence / contradicting in the run worktree's experience.json, or named in
paper/materials/experience-changelog.md. Oldest first (the order lessons.md lists them).
Dai 2026-10-03: the learner folds them in every 10 post-mortems (experience-update task).

  python3 ops/experience-pending.py            # count, then the ids comma-separated
  python3 ops/experience-pending.py --max 30   # at most 30 ids (the oldest)
"""
import json
import os
import re
import sys

ROOT = os.path.expanduser("~/Projects/sts2-jev")
limit = None
if "--max" in sys.argv:
    limit = int(sys.argv[sys.argv.index("--max") + 1])
lessons = open(os.path.join(ROOT, "notes/lessons.md"), encoding="utf8").read()
# Runs listed inside <!-- --> have no post-mortem (the pre-learning-loop A0 runs).
lessons = re.sub(r"<!--.*?-->", "", lessons, flags=re.S)
ids = list(dict.fromkeys(re.findall(r"^## ([0-9A-Z]{12})", lessons, re.M)))
folded = set()
exp = json.load(open(os.path.join(ROOT, "jev-sts2-v4run/src/knowledge/experience.json"), encoding="utf8"))
for entry in exp["entries"]:
    folded.update(entry.get("evidence") or [])
    folded.update(entry.get("contradicting") or [])
changelog = os.path.join(ROOT, "paper/materials/experience-changelog.md")
if os.path.exists(changelog):
    folded.update(re.findall(r"[0-9A-Z]{12}", open(changelog, encoding="utf8").read()))
pending = [run for run in ids if run not in folded]
print(len(pending))
print(",".join(pending[:limit] if limit else pending))
