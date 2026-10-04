#!/usr/bin/env python3
"""Rewrite path mentions after files moved (the restructure's phases 1 and 2; docs/path-map.tsv).

  python3 rewrite-doc-paths.py BASE MODE FILE...      (from the repository root; renames staged with git mv since BASE)

MODE "root": FILE is a document at the project root (docs/, learner/): a mention is a path from the old code root
and becomes the moved file's path from the project root (src/x -> agent/src/x, src/knowledge/<data> ->
knowledge/<subdir>/<data>, tools/build-*.py -> knowledge/builders/..., tools/eval/ -> eval/, .cache/ -> data/).
MODE "agent": FILE is inside agent/ (its README, code comments): a mention of the package's own src/ tests/ tools/
stays package-relative and follows the file's move inside the package; data, builders, eval and .cache mentions
become their project-root paths. Only comment lines are touched in code files (// and * in TypeScript, # in Python
and shell): string literals, which the model may see, are never changed.
"""
import os
import posixpath
import re
import subprocess
import sys

TOKEN = re.compile(r"(?<![\w./@-])(?P<pre>\{\{(?:worktree|code_dir)\}\}/)?(?P<path>(?:src|tools|tests|\.cache)/(?:[\w.*{}@+-]+/?)*)")


def git(*args):
    return subprocess.run(["git", *args], check=True, capture_output=True, text=True).stdout


def main():
    base, mode, files = sys.argv[1], sys.argv[2], sys.argv[3:]
    renames = {}
    for line in git("diff", "--cached", "--name-status", "-M30%", base).split("\n"):
        parts = line.split("\t")
        if parts and parts[0].startswith("R") and len(parts) == 3:
            renames[parts[1]] = parts[2]
    old_files = set(git("ls-tree", "-r", "--name-only", base).split("\n")) - {""}
    old_dirs = {posixpath.dirname(f) for f in old_files}
    old_dirs |= {d for f in old_dirs for d in [posixpath.dirname(f)]}
    # The new directory of an old one: where most of its files went (src/screens -> agent/src/hand/screens, say).
    moved_dir = {}
    for d in sorted(old_dirs):
        if not d:
            continue
        dests = {}
        for f in old_files:
            if posixpath.dirname(f) == d and f in renames:
                nd = posixpath.dirname(renames[f])
                dests[nd] = dests.get(nd, 0) + 1
        if dests:
            moved_dir[d] = max(dests.items(), key=lambda kv: kv[1])[0]
    special = {"src/knowledge": "knowledge", "tools/eval": "eval", ".cache": "data", ".cache/logdb-venv": "data/logdb-venv", ".cache/logdb": "data/logdb"}

    def to_root(path):
        """An old code-root path -> its project-root path (None: not a moved path)."""
        trail = "/" if path.endswith("/") else ""
        p = path.rstrip("/")
        if p in renames:
            return renames[p] + trail
        if p in special:
            return special[p] + trail
        if p.startswith(".cache/"):
            return "data/" + p[len(".cache/"):] + trail
        if p in moved_dir:
            return moved_dir[p] + trail
        # longest moved directory prefix, the rest kept (src/knowledge/render/x -> agent/src/knowledge/render/x)
        parts = p.split("/")
        for i in range(len(parts) - 1, 0, -1):
            head = "/".join(parts[:i])
            if head in special and head != "src/knowledge":
                return special[head] + "/" + "/".join(parts[i:]) + trail
            if head in moved_dir:
                return moved_dir[head] + "/" + "/".join(parts[i:]) + trail
        if parts[0] in ("src", "tools", "tests") and p in old_dirs | {"src", "tools", "tests"}:
            return "agent/" + p + trail
        return None

    def rewrite(text):
        def rep(m):
            path = m.group("path")
            tail = re.search(r"[*.]*$", path).group(0)  # markdown bold or a sentence's full stop after the path
            path = path[: len(path) - len(tail)] if tail and not path.endswith("*.json") else path
            tail = m.group("path")[len(path):]
            new = to_root(path)
            if new is None:
                return m.group(0)
            new += tail
            if mode == "agent" and new.startswith("agent/"):
                new = new[len("agent/"):]
            return (m.group("pre") or "") + new
        return TOKEN.sub(rep, text)

    changed = 0
    for path in files:
        text = open(path, encoding="utf8").read()
        if path.endswith((".md", ".tsv", ".txt")):
            new = rewrite(text)
        else:
            comment = re.compile(r"^(\s*(?://|\*|/\*\*?|#)(?!!))(.*)$") if not path.endswith((".py", ".sh")) else re.compile(r"^(\s*#)(.*)$")
            lines = text.split("\n")
            # A Python module's docstring (the help text and usage) counts as a comment.
            doc = range(0)
            if path.endswith(".py"):
                first = next((i for i, l in enumerate(lines) if l.strip() and not l.startswith("#")), None)
                if first is not None and lines[first].lstrip().startswith(('"""', "r\"\"\"")):
                    end = first if lines[first].count('"""') >= 2 else next((i for i in range(first + 1, len(lines)) if '"""' in lines[i]), first)
                    doc = range(first, end + 1)
            for i, line in enumerate(lines):
                if i in doc:
                    lines[i] = rewrite(line)
                    continue
                m = comment.match(line)
                if m:
                    lines[i] = m.group(1) + rewrite(m.group(2))
            new = "\n".join(lines)
        if new != text:
            open(path, "w", encoding="utf8").write(new)
            changed += 1
    print(f"{changed} files rewritten")


if __name__ == "__main__":
    main()
