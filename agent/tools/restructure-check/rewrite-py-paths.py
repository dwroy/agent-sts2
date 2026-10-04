#!/usr/bin/env python3
"""Phase 1: the Python tools' ROOT becomes the project root (Path(__file__).resolve().parents[n]) and every
os.path.join(ROOT, "<old code-root path>", ...) points at the new place (docs/path-map.tsv). Run from the repo root."""
import re
import subprocess
import sys

CHAR = ("knowledge", "characters", "ironclad")
COMMON = {"monster-db.json", "move-model.json", "event-pages.json", "card-upgrades.json"}
BUILDERS = {"build-boss-damage.py", "build-card-upgrades.py", "build-event-pages.py", "build-fight-value.py", "build-monster-db.py", "build-move-model.py", "build-outcome-stats.py", "build-potion-equivalents.py", "build-room-costs.py", "refresh-potion-equivalents.sh", "monster-db-check.py"}


def mapped(parts):
    """Old code-root-relative path segments -> project-root-relative segments."""
    flat = "/".join(parts).split("/")
    head = flat[0]
    if head == "logs" or head in ("experiments", "notes", "docs"):
        return flat
    if head == ".cache":
        return ["data", *flat[1:]]
    if head == "src":
        if len(flat) == 3 and flat[1] == "knowledge" and re.fullmatch(r"[a-z-]+\.(json|md)", flat[2]):
            return ["knowledge", "common", flat[2]] if flat[2] in COMMON else [*CHAR, flat[2]]
        if flat[1:3] == ["sim", "boss-trust.json"] or flat[1:3] == ["sl", "sl-elites.json"]:
            return [*CHAR, flat[2]]
        return ["agent", *flat]
    if head == "tools":
        if len(flat) >= 2 and flat[1] in BUILDERS:
            return ["knowledge", "builders", *flat[1:]]
        if len(flat) >= 2 and flat[1] == "eval":
            return ["eval", *flat[2:]]
        return ["agent", *flat]
    if head == "tests":
        return ["agent", *flat]
    return None


JOIN = re.compile(r'os\.path\.join\(ROOT((?:,\s*"[^"]*")+)')


def fix_join(m):
    parts = re.findall(r'"([^"]*)"', m.group(1))
    new = mapped(parts)
    if new is None:
        return m.group(0)
    # Keep the call's style: one string with slashes when the original was one string, else one argument per segment.
    if len(parts) == 1 and "/" in parts[0]:
        return f'os.path.join(ROOT, "{"/".join(new)}"'
    return "os.path.join(ROOT, " + ", ".join(f'"{p}"' for p in new)


def depth(path):
    return path.count("/")  # parents[n]: n = number of directories between the file and the root


ROOT_DEF = re.compile(r'^ROOT = os\.path\.dirname\(.*$', re.M)
for path in sys.argv[1:]:
    text = open(path, encoding="utf8").read()
    new = ROOT_DEF.sub(f'ROOT = str(Path(__file__).resolve().parents[{depth(path)}])  # the project root (docs/layout.md)', text, count=1)
    new = JOIN.sub(fix_join, new)
    if new != text and "ROOT = str(Path(" in new and not re.search(r"^from pathlib import .*\bPath\b", new, re.M):
        # after the last top-level "import x" line of the first import block
        lines = new.split("\n")
        idx = [i for i, l in enumerate(lines) if re.match(r"^(import [a-z_.]+(, [a-z_.]+)*|from [a-z_.]+ import .*)$", l)]
        at = idx[-1] + 1 if idx else 0
        lines.insert(at, "from pathlib import Path")
        new = "\n".join(lines)
    if new != text:
        open(path, "w", encoding="utf8").write(new)
        print("rewrote", path)
