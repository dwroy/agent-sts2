#!/usr/bin/env python3
"""Phase 1: Python tools that opened cwd-relative paths (run from the old code root) open them under the project root."""
import re
import sys

MAP = [
    (r'"\.cache/logdb-venv/bin/python"', 'os.path.join(ROOT, "data/logdb-venv/bin/python")'),
    (r'"\.cache/([^"]+)"', r'os.path.join(ROOT, "data/\1")'),
    (r'"tools/logdb/query\.py"', 'os.path.join(ROOT, "agent/tools/logdb/query.py")'),
    (r'"src/knowledge/(monster-db|move-model)\.json"', r'os.path.join(ROOT, "knowledge/common/\1.json")'),
    (r'"logs/([^"]+)"', r'os.path.join(ROOT, "logs/\1")'),
    (r'default="logs"', 'default=os.path.join(ROOT, "logs")'),
    (r'"experiments/([^"]+)"', r'os.path.join(ROOT, "experiments/\1")'),
    (r'(?<![\w/])"tests/([^"]+)"', r'os.path.join(ROOT, "agent/tests/\1")'),
    (r'f"tests/([^"]+)"', r'os.path.join(ROOT, f"agent/tests/\1")'),
]
for path in sys.argv[1:]:
    text = open(path, encoding="utf8").read()
    lines = text.split("\n")
    out = []
    in_doc = False
    for line in lines:
        stripped = line.strip()
        # docstrings and comments keep their text
        if stripped.startswith('"""') or stripped.endswith('"""'):
            if stripped.count('"""') == 1:
                in_doc = not in_doc
            out.append(line)
            continue
        if in_doc or stripped.startswith("#") or "help=" in line:
            out.append(line)
            continue
        for a, b in MAP:
            line = re.sub(a, b, line)
        out.append(line)
    new = "\n".join(out)
    if new == text:
        continue
    depth = path.count("/")
    if not re.search(r"^ROOT = ", new, re.M):
        ls = new.split("\n")
        idx = [i for i, l in enumerate(ls) if re.match(r"^(import [a-z_.]+(, [a-z_.]+)*|from [a-z_.]+ import [^#]*)$", l)]
        at = idx[-1] + 1
        add = []
        if "import os" not in ls:
            add.append("import os")
        if "from pathlib import Path" not in ls:
            add.append("from pathlib import Path")
        add += ["", f"ROOT = str(Path(__file__).resolve().parents[{depth}])  # the project root (docs/layout.md)"]
        ls[at:at] = add
        new = "\n".join(ls)
    open(path, "w", encoding="utf8").write(new)
    print("rewrote", path)
