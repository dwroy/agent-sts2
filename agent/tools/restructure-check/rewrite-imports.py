#!/usr/bin/env python3
"""Rewrite relative module specifiers after files moved (the restructure's phases 1 and 2; docs/path-map.tsv).

Every relative specifier in the repository's TypeScript/JavaScript files (`from "…"`, `import "…"`, `import("…")`,
`typeof import("…")`, `export … from "…"`, `vi.mock/doMock/importActual("…")`, `new URL("…", import.meta.url)`,
`require("…")`) is resolved against the file's location BEFORE the move, in the tree of commit BASE, and pointed at its
target's location AFTER the move (the staged renames since BASE). A specifier that does not resolve in BASE but does
from the file's new place (a new import) is left alone; one that resolves in neither is reported. The suffix style is
kept (a `.js` specifier of a `.ts` file stays `.js`). Nothing else in a file changes.

  python3 rewrite-imports.py BASE [--dry-run] [--rename OLD=NEW ...] [--only FILE ...]
      (run from the repository root, renames staged with git mv)
"""
import os
import posixpath
import re
import subprocess
import sys

SPEC = re.compile(
    r"""(?P<head>(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\bvi\.(?:mock|doMock|importActual|unmock)\s*\(\s*|\brequire\s*\(\s*|\bnew\s+URL\s*\(\s*))(?P<q>["'`])(?P<spec>\.{1,2}/[^"'`$]*)(?P=q)"""
)
EXTS = (".ts", ".mts", ".mjs", ".js", ".cjs", ".tsx", ".json", ".py", ".sql", ".md", ".jsonl", ".txt")
CODE = (".ts", ".mts", ".mjs", ".js", ".cjs")


def git(*args):
    return subprocess.run(["git", *args], check=True, capture_output=True, text=True).stdout


def main():
    base = sys.argv[1]
    dry = "--dry-run" in sys.argv
    # --rename OLD=NEW: a move git does not see as one (a new file left at the old path: src/index.ts's entry shim).
    extra = dict(arg.split("=", 1) for flag, arg in zip(sys.argv, sys.argv[1:]) if flag == "--rename")
    only = {arg for flag, arg in zip(sys.argv, sys.argv[1:]) if flag == "--only"}
    old_files = set(git("ls-tree", "-r", "--name-only", base).split("\n")) - {""}
    renames = {}
    for line in git("diff", "--cached", "--name-status", "-M30%", base).split("\n"):
        parts = line.split("\t")
        if parts and parts[0].startswith("R") and len(parts) == 3:
            renames[parts[1]] = parts[2]
    renames.update(extra)
    new_of = lambda old: renames.get(old, old)
    old_of = {new: old for old, new in renames.items()}
    tracked = [f for f in git("ls-files").split("\n") if f]
    new_files = set(tracked) | {p for p in (os.path.relpath(os.path.join(d, f)) for d, _, fs in os.walk(".") if "node_modules" not in d and "/.git" not in d for f in fs)}

    def resolve(files, frm, spec):
        target = posixpath.normpath(posixpath.join(posixpath.dirname(frm), spec))
        cands = [target]
        if target.endswith(".js"):
            cands = [target[:-3] + ".ts", target[:-3] + ".mts", target]
        elif target.endswith(".mjs"):
            cands = [target, target[:-4] + ".mts"]
        for c in cands:
            if c in files:
                return c
        if target + "/" in {f[: len(target) + 1] for f in files if f.startswith(target + "/")}:
            return target + "/"  # a directory (new URL("./dir/", …))
        return None

    total = 0
    problems = []
    for path in tracked:
        if not path.endswith(CODE) or path.startswith("third_party/") or not os.path.exists(path) or (only and path not in only):
            continue
        old_path = old_of.get(path, path)
        text = open(path, encoding="utf8").read()

        def rep(m):
            nonlocal total
            spec = m.group("spec")
            if old_path in old_files:
                hit = resolve(old_files, old_path, spec)
                if hit is not None:
                    if hit.endswith("/"):
                        moved = {new_of(f) for f in old_files if f.startswith(hit)}
                        new_target = posixpath.commonpath(sorted(moved)) + "/" if moved else hit
                    else:
                        new_target = new_of(hit)
                    rel = posixpath.relpath(new_target.rstrip("/"), posixpath.dirname(path))
                    if not rel.startswith("."):
                        rel = "./" + rel
                    if hit.endswith("/"):
                        rel += "/"
                    # Keep the specifier's own suffix (.js for a .ts target).
                    if spec.endswith(".js") and rel.endswith(".ts"):
                        rel = rel[:-3] + ".js"
                    elif spec.endswith(".js") and rel.endswith(".mts"):
                        rel = rel[:-4] + ".mjs"
                    if rel != spec:
                        total += 1
                        return m.group("head") + m.group("q") + rel + m.group("q")
                    return m.group(0)
            if resolve(new_files, path, spec) is not None:
                return m.group(0)
            problems.append(f"{path}: unresolved {spec}")
            return m.group(0)

        new_text = SPEC.sub(rep, text)
        if new_text != text and not dry:
            open(path, "w", encoding="utf8").write(new_text)
    print(f"{total} specifiers rewritten")
    for p in problems:
        print("  " + p)


if __name__ == "__main__":
    main()
