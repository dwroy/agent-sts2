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
from shared_tools import attach

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
    attach(root, tree, apply=False)


def create(root, directory, tree, ref, require_node=False):
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
              "branch": tree.name, "base": base, "at": retention.stamp(), "state": "allocating", "require_node": require_node,
              "excluded_generated_snapshots": list(EXCLUDED), "canonical_history_kept_in_main_and_git": True}
    retention.atomic(receipt, record)
    created = False
    try:
        retention.git(root, "worktree", "add", "--no-checkout", "-b", tree.name, str(tree), base)
        created = True
        set_profile(tree)
        retention.git(tree, "read-tree", "-mu", "HEAD")
        record["shared_tools"] = attach(root, tree, require_node=require_node)
        if retention.git(tree, "status", "--porcelain", "--untracked-files=all"):
            raise ValueError("new sparse workspace differs from its recorded base")
        record.update(state="allocated", finished_at=retention.stamp())
        retention.atomic(receipt, record)
        return record
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        # No model can start before allocation returns. Preserve the failure receipt, reclaim only this new copy.
        record.update(state="allocation_failed", error=str(error))
        if created and not worktree_retention.active(tree, ignore_pid=os.getpid()):
            try:
                retention.git(root, "worktree", "remove", "--force", str(tree))
                record["failed_checkout_reclaimed"] = True
            except (OSError, ValueError, subprocess.SubprocessError):
                record["failed_checkout_reclaimed"] = False
        retention.atomic(receipt, record)
        raise


def resume(root, directory, tree, ref, require_node=False):
    """Explicitly resume this allocator's exact pre-model receipt; preserve failure history."""
    import worktree_retention
    worktree_retention.checked_tree(root, tree.name)
    if tree.parent != root / '.worktrees':
        raise ValueError('resume workspace outside this instance')
    receipt = retention.safe_path(root, directory / 'retention/allocations' / (tree.name + '.json'))
    record = retention.load(receipt)
    if type(record.get('require_node', False)) is not bool:
        raise ValueError('invalid allocation dependency policy')
    require_node = require_node or record.get('require_node', False)
    base = retention.git(root, 'rev-parse', ref).decode().strip()
    if (record.get('schema') != 'workspace-allocation-v1' or record.get('root') != str(root)
            or record.get('worktree') != str(tree) or record.get('branch') != tree.name or record.get('base') != base
            or record.get('state') not in ('allocating', 'allocation_failed', 'allocated')):
        raise ValueError('resume allocation receipt identity/state mismatch')
    retention.require_host_process_view()
    if worktree_retention.active(tree, ignore_pid=os.getpid()):
        raise ValueError('resume allocation has active processes; original workspace retained')
    branch = 'refs/heads/' + tree.name
    exists = subprocess.run(['git', 'show-ref', '--verify', '--quiet', branch], cwd=root, capture_output=True)
    if exists.returncode not in (0, 1):
        raise ValueError('resume allocation branch cannot be verified')
    if exists.returncode == 0 and retention.git(root, 'rev-parse', branch).decode().strip() != base:
        raise ValueError('resume allocation branch changed; original source retained')
    if tree.exists():
        common = retention.git(tree, 'rev-parse', '--git-common-dir').decode().strip()
        original = retention.git(root, 'rev-parse', '--git-common-dir').decode().strip()
        if ((tree / common).resolve() != (root / original).resolve()
                or retention.git(tree, 'branch', '--show-current').decode().strip() != tree.name
                or retention.git(tree, 'rev-parse', 'HEAD').decode().strip() != base
                or retention.git(tree, 'status', '--porcelain', '--untracked-files=all')):
            raise ValueError('resume allocation workspace changed; original state retained')
    record.setdefault('resume_history', []).append(dict(at=retention.stamp(), state=record['state'],
        error=record.get('error'), failed_checkout_reclaimed=record.get('failed_checkout_reclaimed')))
    record.update(state='allocating', require_node=require_node); retention.atomic(receipt, record)
    try:
        if not tree.exists():
            if exists.returncode == 0:
                restore_checkout(root, tree, tree.name)
            else:
                require_worktree_capacity(root, base, keep=lambda name: not cold(name))
                retention.git(root, 'worktree', 'add', '--no-checkout', '-b', tree.name, str(tree), base)
                set_profile(tree)
                retention.git(tree, 'read-tree', '-mu', 'HEAD')
        record['shared_tools'] = attach(root, tree, require_node=require_node)
        if retention.git(tree, 'status', '--porcelain', '--untracked-files=all'):
            raise ValueError('resumed sparse workspace differs from its recorded base')
        record.update(state='allocated', finished_at=retention.stamp())
        retention.atomic(receipt, record)
        return record
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        record.update(state='allocation_failed', error=str(error))
        retention.atomic(receipt, record)
        raise


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("root");p.add_argument("worktree");p.add_argument("ref")
    p.add_argument('--resume', action='store_true', help='resume only this exact recorded allocation')
    p.add_argument('--require-node', action='store_true', help='require the existing verified Node provider for issue sessions')
    a = p.parse_args();root = Path(a.root).resolve()
    directory = retention.safe_path(root, os.environ.get("CODEX_OPS_DIR") or root / "ops/codex-ops")
    try:
        result = (resume if a.resume else create)(root, directory, retention.safe_path(root, a.worktree), a.ref,
                                                 require_node=a.require_node)
        print(json.dumps(result, ensure_ascii=False));return 0
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        print(json.dumps({"state": "retained", "reason": str(error)}, ensure_ascii=False), file=sys.stderr);return 1


if __name__ == "__main__":
    raise SystemExit(main())
