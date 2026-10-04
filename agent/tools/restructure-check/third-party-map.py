#!/usr/bin/env python3
"""docs/upstream-files.tsv: every file of upstream jev-sts2 at UPSTREAM (002e873, third_party/jev-sts2), where it is in
this repository now (docs/path-map.tsv), and how it compares: at V4 (the last commit before the restructure) and now.

  python3 third-party-map.py [UPSTREAM] [V4] > docs/upstream-files.tsv      (from the repository root)

Status values: identical (byte for byte), imports (only import/export specifier lines differ), changed +A -D (the
diff's added and removed lines against upstream).
"""
import difflib
import re
import subprocess
import sys

UPSTREAM = sys.argv[1] if len(sys.argv) > 1 else "002e873"
V4 = sys.argv[2] if len(sys.argv) > 2 else "5ec1384"
IMPORT = re.compile(r'^\s*(import\b.*from\s*"[^"]+";|export\b.*from\s*"[^"]+";|\}\s*from\s*"[^"]+";|import\s*"[^"]+";)\s*$')


def git(*args):
    return subprocess.run(["git", *args], check=True, capture_output=True, text=True).stdout


def blob(rev, path):
    try:
        return subprocess.run(["git", "show", f"{rev}:{path}"], check=True, capture_output=True).stdout.decode("utf8")
    except subprocess.CalledProcessError:
        return None


def compare(theirs, ours):
    if ours is None:
        return "absent"
    if theirs == ours:
        return "identical"
    a, b = theirs.split("\n"), ours.split("\n")
    added = removed = 0
    only_imports = True
    for line in difflib.unified_diff(a, b, lineterm="", n=0):
        if line.startswith(("---", "+++", "@@")):
            continue
        if line.startswith("+"):
            added += 1
        elif line.startswith("-"):
            removed += 1
        else:
            continue
        if not IMPORT.match(line[1:]):
            only_imports = False
    return "imports" if only_imports else f"changed +{added} -{removed}"


moved = {}
for line in open("docs/path-map.tsv", encoding="utf8"):
    if line.startswith("#") or "\t" not in line:
        continue
    old, new = line.rstrip("\n").split("\t")
    moved[old] = new

print(f"# upstream path (jev-sts2 {UPSTREAM})\tour path now\tat v4 {V4}\tnow")
for path in sorted(f for f in git("ls-tree", "-r", "--name-only", UPSTREAM).split("\n") if f):
    theirs = blob(UPSTREAM, path)
    ours_path = moved.get(path, path)
    try:
        ours = open(ours_path, encoding="utf8").read()
    except OSError:
        ours = None
    print(f"{path}\t{ours_path}\t{compare(theirs, blob(V4, path))}\t{compare(theirs, ours)}")
