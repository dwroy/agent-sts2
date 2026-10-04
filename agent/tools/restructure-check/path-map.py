#!/usr/bin/env python3
"""docs/path-map.tsv: every file the restructure moved, old path (jev-sts2 code repo at BASE) -> new path (project
root), from git's staged renames since BASE, plus the untracked directories that move at cutover.

  python3 path-map.py BASE > docs/path-map.tsv      (from the repository root, everything staged)
"""
import subprocess
import sys

base = sys.argv[1]
out = subprocess.run(["git", "diff", "--cached", "--name-status", "-M30%", base], check=True, capture_output=True, text=True).stdout
rows = []
for line in out.split("\n"):
    parts = line.split("\t")
    if parts and parts[0].startswith("R") and len(parts) == 3:
        rows.append((parts[1], parts[2]))
print("# old path (jev-sts2, code root)\tnew path (project root)")
print("# not in git, moved at cutover:")
print("#   logs/\tlogs/")
print("#   .cache/\tdata/        (game-data.json, logdb/, logdb-venv/, fight-value-rows.jsonl)")
print("#   node_modules/\tagent/node_modules/")
print("#   .env\tagent/.env")
for old, new in sorted(rows):
    print(f"{old}\t{new}")
