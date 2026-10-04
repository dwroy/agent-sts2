#!/usr/bin/env python3
"""Phase 1: agent/tests' paths. ROOT/REPO in a test is agent/ (the tests' parent) after the move; what moved out of
it (logs, .cache -> data, src/knowledge data, tools/eval, the builders, learner/) is reached through "..". The pinned
knowledge tests match a file by its name (the files now sit in common/ and characters/<id>/) and read the two files
that lived outside src/knowledge before the move (boss-trust.json, sl-elites.json) as they are."""
import re
import sys

COMMON = {"monster-db.json", "move-model.json", "event-pages.json", "card-upgrades.json"}
BUILDERS = r"(build-[a-z-]+\.py|refresh-potion-equivalents\.sh|monster-db-check\.py)"


def kfile(name):
    return f"knowledge/common/{name}" if name in COMMON else f"knowledge/characters/ironclad/{name}"


SUBS = [
    (r'join\((ROOT|REPO), "src", "knowledge"\)', r'join(\1, "..", "knowledge")'),
    (r'join\(HERE, "\.\.", "src", "knowledge"\)', r'join(HERE, "..", "..", "knowledge")'),
    (r'join\((ROOT|REPO), "logs"\)', r'join(\1, "..", "logs")'),
    (r'join\((ROOT|REPO), "\.cache"\)', r'join(\1, "..", "data")'),
    (r'join\((ROOT|REPO), "\.cache/([^"]+)"\)', r'join(\1, "..", "data/\2")'),
    (r'join\((ROOT|REPO), "logs/([^"]+)"\)', r'join(\1, "..", "logs/\2")'),
    (r'join\((ROOT|REPO), "tools/eval/([^"]+)"\)', r'join(\1, "..", "eval/\2")'),
    (r'join\((ROOT|REPO), "tools/' + BUILDERS + r'"\)', r'join(\1, "..", "knowledge/builders/\2")'),
    (r'join\((ROOT|REPO), "src/knowledge/([a-z-]+\.(?:json|md))"\)', lambda m: f'join({m.group(1)}, "..", "{kfile(m.group(2))}")'),
    (r'join\((ROOT|REPO), "learner", "tasks"\)', r'join(\1, "..", "learner", "tasks")'),
]
for path in sys.argv[1:]:
    text = open(path, encoding="utf8").read()
    new = text
    for a, b in SUBS:
        new = re.sub(a, b, new)
    if "const name = resolve(path).slice(KNOWLEDGE.length + 1);" in new:
        new = new.replace("const name = resolve(path).slice(KNOWLEDGE.length + 1);", "const name = basename(resolve(path));")
        new = re.sub(r'(\n(\s*)throw Object\.assign\(new Error\(`ENOENT: pinned test, \$\{name\}`\))',
                     r'\n\2// Outside the knowledge directory before the move (src/sim, src/sl): read as they are.\n\2if (name === "boss-trust.json" || name === "sl-elites.json") return read(path, ...rest);\1', new, count=1)
        new = re.sub(r'^import \{ dirname, join, resolve \} from "node:path";$', 'import { basename, dirname, join, resolve } from "node:path";', new, count=1, flags=re.M)
        assert "basename, dirname" in new, path
    if new != text:
        open(path, "w", encoding="utf8").write(new)
        print("rewrote", path)
