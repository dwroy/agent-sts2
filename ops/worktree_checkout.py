#!/usr/bin/env python3
"""Allocate isolated workspaces without repeatedly materializing old generated snapshots."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
import learner_retention as retention
from disk_capacity import require_worktree_capacity

EXCLUDED = ("paper/data/history/", "paper/raw/", "paper/materials/", "experiments/")


def cold(name):
    if name.startswith("paper/materials/"):
        tail = name.removeprefix("paper/materials/")
        if ("/" not in tail and tail.endswith(".md")) or tail.startswith("learning/"):
            return False
    return any(name.startswith(prefix) for prefix in EXCLUDED)


def sparse_patterns(includes=()):
    # Keep current handoff and learning ledgers; cold evidence is available by pinned Git object.
    patterns = ["/*", *("!/" + p + "*" for p in EXCLUDED),
                "/paper/materials/*.md", "/paper/materials/learning/"]
    for name in sorted(set(includes)):
        parts = name.split("/")
        for depth in range(2, len(parts)):
            parent = "/" + "/".join(parts[:depth]) + "/"
            patterns.extend([parent, "!" + parent + "*"])
    # Leaves must follow all ancestor exclusions, including shared ancestors.
    patterns.extend("/" + name for name in sorted(set(includes)))
    patterns.extend(["/paper/materials/*.md", "/paper/materials/learning/"])
    return "\n".join(patterns) + "\n"


def set_profile(tree, includes=()):
    subprocess.run(["git", "-C", str(tree), "sparse-checkout", "set", "--no-cone", "--stdin"],
                   input=sparse_patterns(includes).encode(), capture_output=True, check=True)


def restore_checkout(root, tree, branch):
    require_worktree_capacity(root, branch, keep=lambda name: not cold(name))
    retention.git(root, "worktree", "add", "--no-checkout", str(tree), branch)
    set_profile(tree)
    retention.git(tree, "read-tree", "-mu", "HEAD")


def create(root, directory, tree, ref):
    import worktree_retention
    if tree.parent != root / ".worktrees":
        raise ValueError("workspace outside this instance")
    worktree_retention.checked_tree(root, tree.name)
    if tree.exists():
        raise ValueError("existing workspace retained; use explicit restore for a retired workspace")
    require_worktree_capacity(root, ref, keep=lambda name: not cold(name))
    receipt = directory / "retention/allocations" / (tree.name + ".json")
    if receipt.exists():
        raise ValueError("allocation name already used; retain its original receipt")
    base = retention.git(root, "rev-parse", ref).decode().strip()
    record = {"schema": "workspace-allocation-v1", "root": str(root), "worktree": str(tree),
              "branch": tree.name, "base": base, "at": retention.stamp(), "state": "allocating",
              "excluded_generated_snapshots": list(EXCLUDED), "canonical_history_kept_in_main_and_git": True}
    retention.atomic(receipt, record)
    created = False
    try:
        retention.git(root, "worktree", "add", "--no-checkout", "-b", tree.name, str(tree), base)
        created = True
        set_profile(tree)
        retention.git(tree, "read-tree", "-mu", "HEAD")
        if retention.git(tree, "status", "--porcelain", "--untracked-files=all"):
            raise ValueError("new sparse workspace differs from its recorded base")
        record.update(state="allocated", finished_at=retention.stamp())
        retention.atomic(receipt, record)
        return record
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        # No model can start before allocation returns. Preserve the failure receipt, reclaim only this new copy.
        record.update(state="allocation_failed", error=str(error))
        if created and not worktree_retention.active(tree):
            try:
                retention.git(root, "worktree", "remove", "--force", str(tree))
                record["failed_checkout_reclaimed"] = True
            except (OSError, ValueError, subprocess.SubprocessError):
                record["failed_checkout_reclaimed"] = False
        retention.atomic(receipt, record)
        raise


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("root");p.add_argument("worktree");p.add_argument("ref")
    a = p.parse_args();root = Path(a.root).resolve()
    directory = retention.safe_path(root, os.environ.get("CODEX_OPS_DIR") or root / "ops/codex-ops")
    try:
        result = create(root, directory, retention.safe_path(root, a.worktree), a.ref)
        print(json.dumps(result, ensure_ascii=False));return 0
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        print(json.dumps({"state": "retained", "reason": str(error)}, ensure_ascii=False), file=sys.stderr);return 1


if __name__ == "__main__":
    raise SystemExit(main())
