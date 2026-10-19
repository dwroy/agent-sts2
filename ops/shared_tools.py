#!/usr/bin/env python3
"""Attach existing matching tools to a sparse checkout; never install or copy dependencies."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def matching(root, tree, names):
    for name in names:
        source, target = root / name, tree / name
        if not source.is_file() or not target.is_file() or source.is_symlink() or target.is_symlink():
            raise ValueError("shared tool lock/manifest missing: " + name)
        if source.read_bytes() != target.read_bytes():
            raise ValueError("shared tool lock/manifest mismatch: " + name)
    return {name: sha(root / name) for name in names}


def link(root, tree, name):
    source, destination = root / name, tree / name
    if destination.is_symlink():
        if destination.resolve() != source.resolve():
            raise ValueError("foreign shared tool link retained: " + name)
        return "existing_verified_link"
    if destination.exists():
        raise ValueError("private dependency copy retained; no automatic deletion: " + name)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.symlink_to(os.path.relpath(source, destination.parent), target_is_directory=True)
    return "linked"


def attach(root, tree, apply=True):
    root, tree = Path(root).resolve(), Path(tree).resolve()
    if tree.parent != root / ".worktrees":
        raise ValueError("shared tools need an isolated workspace in this instance")
    planned = []
    result = {"schema": "shared-readonly-tools-v1", "root": str(root), "worktree": str(tree),
              "source_permissions_unchanged": True, "install_or_dependency_copy": False, "tools": {}}
    modules = root / "agent/node_modules"
    if modules.is_dir():
        manifests = ("agent/package.json", "agent/package-lock.json")
        if not any((root / name).exists() or (tree / name).exists() for name in manifests):
            # Tiny fixed Git fixtures with no Node package have no dependency contract.
            result["tools"]["node"] = {"state": "not_a_node_package"}
        else:
            hashes = matching(root, tree, manifests)
            installed_file = modules / ".package-lock.json"
            if not installed_file.is_file():
                raise ValueError("installed Node lock metadata missing; no unverified sharing")
            expected = json.loads((root / manifests[1]).read_text())["packages"]
            installed = json.loads(installed_file.read_text())["packages"]
            if not installed:
                raise ValueError("installed dependency metadata is empty; no verified tool provider")
            package = json.loads((root / manifests[0]).read_text())
            required = set(package.get("dependencies", {})) | set(package.get("devDependencies", {}))
            if any("node_modules/" + name not in installed for name in required):
                raise ValueError("required pinned tool is missing from installed metadata")
            for name, value in installed.items():
                wanted = expected.get(name)
                if wanted is None or any(value.get(k) != wanted.get(k) for k in ("version", "integrity")):
                    raise ValueError("installed dependency differs from the pinned lock: " + name)
            runtime = json.loads(subprocess.check_output(["node", "-p", "JSON.stringify({node:process.version,abi:process.versions.modules,platform:process.platform,arch:process.arch})"], text=True))
            result["tools"]["node"] = {"state": "verified",
                "source": str(modules.resolve()), "manifests": hashes, "installed_lock_sha256": sha(installed_file),
                "runtime": runtime, "consumer_cache": str(tree / ".cache/vitest"), "usage": "read-only"}
            planned.append(("node", "agent/node_modules"))
    venv = root / "data/logdb-venv"
    if venv.is_dir():
        hashes = matching(root, tree, ("agent/tools/logdb/requirements.txt",))
        if not (venv / "pyvenv.cfg").is_file():
            raise ValueError("Python environment identity missing; no unverified sharing")
        # Query metadata only: no installation, network or database sync.
        runtime = json.loads(subprocess.check_output([str(venv / "bin/python"), "-B", "-c",
            "import sys,json,importlib.metadata as m;print(json.dumps({'python':list(sys.version_info[:3]),'cache_tag':sys.implementation.cache_tag,'duckdb':m.version('duckdb')}))"], text=True))
        requirements = [line.strip() for line in (root / "agent/tools/logdb/requirements.txt").read_text().splitlines()
                        if line.strip() and not line.lstrip().startswith("#")]
        if requirements != ["duckdb==" + runtime["duckdb"]]:
            raise ValueError("installed Python tools differ from pinned requirements")
        result["tools"]["python"] = {"state": "verified",
            "source": str(venv.resolve()), "manifests": hashes, "runtime": runtime, "usage": "read-only"}
        planned.append(("python", "data/logdb-venv"))
    # Validate every existing destination before creating either optional link.
    for _, name in planned:
        destination = tree / name
        if (destination.is_symlink() and destination.resolve() != (root / name).resolve()) or (destination.exists() and not destination.is_symlink()):
            raise ValueError("private or foreign dependency retained: " + name)
    if apply:
        for tool, name in planned:
            result["tools"][tool]["state"] = link(root, tree, name)
    return result


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("root", type=Path)
    p.add_argument("worktree", type=Path)
    args = p.parse_args()
    print(json.dumps(attach(args.root, args.worktree), ensure_ascii=False))


if __name__ == "__main__":
    main()
