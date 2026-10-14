#!/usr/bin/env python3
"""Evict idle, reconstructible Git copies without completing or removing their tasks."""
import argparse
import base64
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import uuid

sys.path.insert(0, str(Path(__file__).resolve().parent))
import learner_retention as retention
import worktree_checkout as checkout
import worktree_retention as workspaces

COPIES = {".source-checkout", ".before-checkout", "source-archive.tar"}
MAX_INPUT_BYTES = 256 * 1024 * 1024


def cold(name):
    return checkout.cold(name)


def profile(tree):
    return Path(retention.git(tree, "rev-parse", "--git-path", "info/sparse-checkout").decode().strip())


def receipt(directory, tree):
    return directory / "retention/storage/workspaces" / (tree.name + ".json")


def checked(root, tree):
    if tree.parent != root / ".worktrees" or not workspaces.NAME.fullmatch(tree.name):
        raise ValueError("workspace outside this instance")
    if tree.name in ("live", "regent-climb") or any((tree / p).exists() for p in
            ("ops/instance-binding.json", "ops/regent-lane.json")):
        raise ValueError("persistent runtime retained")
    rows = [row for row in workspaces.registered(root) if row["worktree"] == str(tree)]
    if len(rows) != 1 or rows[0].get("locked") or not rows[0].get("branch") or not (tree / ".git").is_file():
        raise ValueError("unregistered, locked or detached workspace retained")
    for phase in ("MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-merge", "rebase-apply"):
        if Path(retention.git(tree, "rev-parse", "--git-path", phase).decode().strip()).exists():
            raise ValueError("unfinished Git transaction retained")
    return rows[0]


def idle(root, directory, tree):
    retention.require_host_process_view()
    row = checked(root, tree)
    if workspaces.active(tree, ignore_pid=os.getpid()):
        raise ValueError("active process or controller reference retained")
    state = retention.load(directory / "learn.json") if (directory / "learn.json").is_file() else {}
    if any(batch.get("state") == "running" and Path(batch.get("worktree") or root) == tree
           for batch in state.get("batches", {}).values()):
        raise ValueError("running batch retained")
    return row


def workspace_lock(root, directory, tree):
    # Same lease used by the existing learner starter; no second scheduler or model is created.
    return retention.locks([directory / "learn.lock", root / "ops/live-merge.lock",
                            profile(tree).parent / "storage.lock",
                            directory / "learner" / (tree.name + ".lock")])


def status(tree):
    return retention.git(tree, "status", "--porcelain=v1", "-z", "--untracked-files=all")


def tracked_dirty(tree):
    names = set()
    for args in (("diff", "--name-only", "-z"), ("diff", "--cached", "--name-only", "-z")):
        names.update(os.fsdecode(raw) for raw in retention.git(tree, *args).split(b"\0") if raw)
    return names


def journal(directory, data):
    destination = directory / "retention/storage/actions" / (uuid.uuid4().hex + ".json")
    retention.atomic(destination, data)
    return destination


def thin(root, directory, tree, apply=True):
    with workspace_lock(root, directory, tree):
        row = idle(root, directory, tree)
        head = retention.git(tree, "rev-parse", "HEAD").decode().strip()
        before = status(tree)
        # Modified cold evidence remains materialized, even for failed or un-ingested tasks.
        includes = sorted(name for name in tracked_dirty(tree) if cold(name))
        desired = checkout.sparse_patterns(includes).encode()
        p = profile(tree)
        if p.is_file() and p.read_bytes() == desired:
            return {"worktree": str(tree), "state": "already_thin", "head": head}
        candidates = []
        for raw in retention.git(tree, "ls-files", "-z").split(b"\0"):
            if not raw:
                continue
            name = os.fsdecode(raw)
            path = tree / name
            if cold(name) and name not in includes and path.is_file() and not path.is_symlink():
                candidates.append((name, path.stat().st_blocks * 512))
        result = {"schema": "workspace-storage-v1", "at": retention.stamp(), "root": str(root),
                  "worktree": str(tree), "branch": row["branch"], "head": head,
                  "state": "eligible", "git_cache_bytes": sum(size for _, size in candidates),
                  "git_cache_files": len(candidates), "includes": includes,
                  "task_state_unchanged": True, "original_cwd_kept": True}
        if not apply:
            return result
        action = journal(directory, {**result, "state": "prepared", "status_base64": base64.b64encode(before).decode(),
                                    "prior_profile_base64": base64.b64encode(p.read_bytes() if p.is_file() else b"").decode()})
        # Pin the actual baseline independently of future branch advancement or garbage collection.
        retention.git(root, "update-ref", "refs/storage-cache/" + action.stem, head)
        idle(root, directory, tree)
        if status(tree) != before or retention.git(tree, "rev-parse", "HEAD").decode().strip() != head:
            raise ValueError("workspace changed before eviction; retained")
        checkout.set_profile(tree, includes)
        if status(tree) != before or retention.git(tree, "rev-parse", "HEAD").decode().strip() != head:
            raise ValueError("workspace verification changed; prepared journal retained")
        removed = [(name, size) for name, size in candidates if not (tree / name).exists()]
        result.update(state="thin", removed_git_cache_bytes=sum(size for _, size in removed),
                      removed_git_cache_files=len(removed), journal=str(action.relative_to(root)))
        retention.atomic(receipt(directory, tree), result)
        journal(directory, result)
        return result


def input_name(name):
    if not name or name.startswith("/") or any(part in ("", ".", "..") for part in name.split("/")):
        raise ValueError("invalid input path")
    if any(c in name for c in "\n\r\0*?![]\\#") or not cold(name) or retention.secret_name(name):
        raise ValueError("only exact cold evidence files may be materialized")
    return name


def materialize(root, directory, tree, names):
    checked(root, tree)
    with retention.locks([profile(tree).parent / "storage.lock"]):
        return restore_inputs(root, directory, tree, names)


def restore_inputs(root, directory, tree, names):
    checked(root, tree)
    names = sorted(set(input_name(name) for name in names))
    if not names or len(names) > 128:
        raise ValueError("request 1 to 128 exact input files")
    head = retention.git(tree, "rev-parse", "HEAD").decode().strip()
    objects = []
    for name in names:
        raw = retention.git(tree, "ls-tree", "-l", head, "--", name).decode().strip()
        if not raw:
            raise ValueError("input absent from workspace baseline: " + name)
        metadata, actual = raw.split("\t", 1)
        mode, kind, oid, size = metadata.split()
        if actual != name or kind != "blob" or mode not in ("100644", "100755"):
            raise ValueError("input must be a regular tracked file")
        retention.safe_path(tree, tree / name)
        objects.append({"path": name, "blob": oid, "bytes": int(size)})
    if sum(item["bytes"] for item in objects) > MAX_INPUT_BYTES:
        raise ValueError("input cache request exceeds 256 MiB; split exact inputs")
    p = profile(tree)
    if not p.is_file():
        # Full legacy workspaces already have the inputs. Do not evict anything during startup.
        includes = None
    else:
        text = p.read_text()
        # Accept our old history-only profile, or the current managed profile. Keep every existing leaf.
        leaves = [line[1:] for line in text.splitlines() if line.startswith("/")
                  and not line.endswith(("/", "*")) and cold(line[1:])]
        old = "/*\n!/paper/data/history/\n"
        if text not in (old, checkout.sparse_patterns(leaves)):
            raise ValueError("unmanaged sparse profile retained")
        includes = sorted(set(leaves + names + [name for name in tracked_dirty(tree) if cold(name)]))
        dirty = tracked_dirty(tree)
        cache_bytes = 0
        for name in includes:
            if name in dirty:
                continue
            raw = retention.git(tree, "ls-tree", "-l", head, "--", name).decode().strip()
            if raw:
                cache_bytes += int(raw.split("\t", 1)[0].split()[3])
        if cache_bytes > MAX_INPUT_BYTES:
            raise ValueError("workspace historical input cache exceeds 256 MiB; keep exact required inputs")
        from disk_capacity import require_capacity
        require_capacity(tree, sum(item["bytes"] for item in objects if not (tree / item["path"]).exists()), len(objects))
    before = status(tree)
    if includes is not None:
        checkout.set_profile(tree, includes)
    if retention.git(tree, "rev-parse", "HEAD").decode().strip() != head or status(tree) != before:
        raise ValueError("input restoration changed workspace status")
    dirty = tracked_dirty(tree)
    for item in objects:
        path = tree / item["path"]
        if not path.is_file() or path.is_symlink():
            raise ValueError("input restoration incomplete")
        if item["path"] not in dirty and retention.git(tree, "hash-object", "--", item["path"]).decode().strip() != item["blob"]:
            raise ValueError("restored input differs from pinned Git blob")
    result = {"state": "materialized", "head": head, "worktree": str(tree), "inputs": objects,
              "task_state_unchanged": True}
    # The evidence can be written in the caller's own scratch even in a restricted learner sandbox.
    return result


def copy_paths(root, scratch):
    files = []
    for name in sorted(COPIES):
        path = scratch / name
        if not path.exists():
            continue
        if path.is_symlink():
            raise ValueError("source cache symlink retained")
        entries = [path] if path.is_file() else sorted(path.rglob("*"))
        for item in entries:
            if item.is_symlink():
                try:
                    workspaces.dependency(root, path, item)
                except ValueError as error:
                    original = scratch.parent.parent.parent
                    if str(item.relative_to(path)) != "agent/node_modules" or item.resolve() != (original / "agent/node_modules").resolve():
                        raise ValueError("source cache symlink retained") from error
        # Verified dependency links remain at their original paths and are never archived or deleted.
        candidates = [item for item in entries if not item.is_dir() and not item.is_symlink()]
        for item in candidates:
            retention.safe_path(root, item)
            secret = retention.secret_name(item)
            if secret and item.name == ".env.example":
                relative = str(item.relative_to(path)) if path.is_dir() else name
                raw = retention.git(scratch.parent.parent.parent, "ls-tree", "HEAD", "--", relative).decode().strip()
                secret = not raw or raw.split()[2] != retention.git(scratch.parent.parent.parent, "hash-object", str(item)).decode().strip()
            if not item.is_file() or item.is_symlink() or secret:
                raise ValueError("credential-named or nonregular source cache retained")
            if ".git" in item.relative_to(scratch).parts:
                raise ValueError("nested Git workspace retained")
            files.append(item)
    return sorted(files)


def compress(root, directory, batch_id, scratch, apply=True):
    if not retention.BATCH.fullmatch(batch_id):
        raise ValueError("invalid original batch")
    scratch = retention.safe_path(root, scratch)
    statefile = directory / "learn.json"
    with retention.locks([directory / "learn.lock", root / "ops/live-merge.lock"]):
        retention.require_host_process_view()
        state = retention.load(statefile)
        batch = state.get("batches", {}).get(batch_id)
        if not batch or batch.get("state") == "running":
            raise ValueError("unknown or running original batch retained")
        tree = retention.safe_path(root, batch.get("worktree") or root)
        idle(root, directory, tree)
        if scratch.parent != tree / "learner/runs":
            raise ValueError("scratch outside original workspace")
        event = scratch.with_suffix(".jsonl")
        with event.open() as handle:
            launch = json.loads(handle.readline())
        bound_report = batch.get("report", {}).get("report")
        if (launch.get("type") != "learner_launch" or launch.get("cwd") != str(tree)
                or launch.get("task") != batch.get("task")
                or bound_report != str(scratch / "report.md")
                or launch.get("params", {}).get("scratch") != str(scratch)):
            raise ValueError("original launcher binding not verified")
        base = directory / "retention/storage/source-copies" / batch_id
        manifestfile = base.with_suffix(".manifest.json")
        if manifestfile.exists():
            manifest = retention.load(manifestfile)
            if manifest["root"] != str(root) or manifest["scratch"] != str(scratch.relative_to(root)):
                raise ValueError("source cache recovery binding mismatch")
        else:
            files = copy_paths(root, scratch)
            if not files:
                return {"state": "no_source_copies", "batch": batch_id}
            if not apply:
                return {"state": "eligible", "batch": batch_id, "bytes": sum(p.stat().st_size for p in files)}
            manifest, manifestfile = retention.archive(root, base, scratch, files, {
                "batch": batch_id, "original_task_state": batch["state"], "worktree": str(tree),
                "launcher_sha256": retention.sha_file(event), "scope": "source process copies only; no task completed"})
        if not apply:
            return {"state": manifest["state"], "batch": batch_id}
        if retention.sha_file(root / manifest["archive"]) != manifest["archive_sha256"]:
            raise ValueError("source cache archive hash changed")
        if {str(p.relative_to(root)) for p in copy_paths(root, scratch)} - {item["path"] for item in manifest["files"]}:
            raise ValueError("new source cache files retained")
        # Check all remaining originals before deleting any; interrupted deletion is idempotent.
        for record in manifest["files"]:
            path = retention.safe_path(root, record["path"])
            if path.exists() and retention.sha_file(path) != record["sha256"]:
                raise ValueError("source cache changed after archival")
        idle(root, directory, tree)
        for record in manifest["files"]:
            path = retention.safe_path(root, record["path"])
            if path.exists():
                path.unlink()
        for name in COPIES:
            path = scratch / name
            if path.is_dir():
                for child in sorted(path.rglob("*"), key=lambda p: len(p.parts), reverse=True):
                    if child.is_dir() and not child.is_symlink():
                        try:
                            child.rmdir()
                        except OSError:
                            pass  # Keep verified dependency links at their original paths.
                try:
                    path.rmdir()
                except OSError:
                    pass
        manifest.update(state="source_copies_compressed", reclaimed_at=retention.stamp())
        retention.atomic(manifestfile, manifest)
        return {"state": manifest["state"], "batch": batch_id, "archive_bytes": manifest["archive_bytes"],
                "original_bytes": sum(item["bytes"] for item in manifest["files"]), "task_state_unchanged": True}


def restore_copies(root, directory, batch_id):
    manifest = retention.load(directory / "retention/storage/source-copies" / (batch_id + ".manifest.json"))
    if manifest["root"] != str(root) or manifest["proof"]["batch"] != batch_id:
        raise ValueError("source cache restore binding mismatch")
    archive = retention.safe_path(root, manifest["archive"])
    if retention.sha_file(archive) != manifest["archive_sha256"]:
        raise ValueError("source cache archive hash changed")
    # Preflight every existing path before restoring any member; never overwrite changed artifacts.
    for record in manifest["files"]:
        path = retention.safe_path(root, record["path"])
        if path.exists() and retention.sha_file(path) != record["sha256"]:
            raise ValueError("changed source cache retained")
    from disk_capacity import require_capacity
    require_capacity(root, sum(item["bytes"] for item in manifest["files"]
                               if not (root / item["path"]).exists()), len(manifest["files"]))
    with tarfile.open(archive, "r:gz") as tar:
        members = tar.getmembers()
        if [member.name for member in members] != [item["path"] for item in manifest["files"]] or not all(m.isfile() for m in members):
            raise ValueError("source cache archive member mismatch")
        for member, record in zip(members, manifest["files"]):
            path = retention.safe_path(root, record["path"])
            if path.exists():
                continue
            path.parent.mkdir(parents=True, exist_ok=True)
            temporary = path.with_name(path.name + ".storage-restore")
            with tar.extractfile(member) as source, temporary.open("xb") as target:
                for block in iter(lambda: source.read(1024 * 1024), b""):
                    target.write(block)
            if retention.sha_file(temporary) != record["sha256"]:
                raise ValueError("source cache member hash mismatch")
            temporary.chmod(record["mode"])
            os.replace(temporary, path)
    return {"state": "source_copies_restored", "batch": batch_id, "task_state_unchanged": True}


def sweep(root, directory, apply=True, limit=4):
    result = {"at": retention.stamp(), "results": [], "retained": [], "limit": limit,
              "policy": "idle clean Git history cache evicted; source, unique evidence and task states kept"}
    for row in workspaces.registered(root):
        tree = Path(row["worktree"])
        if tree.parent != root / ".worktrees":
            continue
        try:
            item = thin(root, directory, tree, apply)
            if item["state"] != "already_thin":
                result["results"].append(item)
        except (OSError, ValueError, subprocess.SubprocessError) as error:
            result["retained"].append({"worktree": str(tree), "reason": str(error)})
        if len(result["results"]) >= limit:
            break
    state = retention.load(directory / "learn.json") if (directory / "learn.json").is_file() else {}
    for batch_id, batch in state.get("batches", {}).items():
        if len(result["results"]) >= limit:
            break
        report = batch.get("report", {}).get("report")
        if batch.get("state") == "running" or not report:
            continue
        try:
            scratch = retention.safe_path(root, report).parent
            prior = directory / "retention/storage/source-copies" / (batch_id + ".manifest.json")
            if prior.is_file():
                archived = retention.load(prior)
                if archived.get("state") == "source_copies_compressed" and not any((root / item["path"]).exists() for item in archived["files"]):
                    continue
            if not any((scratch / name).exists() for name in COPIES):
                continue
            item = compress(root, directory, batch_id, scratch, apply)
            result["results"].append(item)
        except (OSError, ValueError, KeyError, subprocess.SubprocessError) as error:
            result["retained"].append({"batch": batch_id, "reason": str(error)})
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["thin", "sweep", "materialize", "compress", "restore-copies"])
    parser.add_argument("--root", default=os.environ.get("CODEX_OPS_ROOT") or Path(__file__).resolve().parents[1])
    parser.add_argument("--state-dir", default=os.environ.get("CODEX_OPS_DIR"))
    parser.add_argument("--workspace")
    parser.add_argument("--path", action="append", default=[])
    parser.add_argument("--batch")
    parser.add_argument("--scratch")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--limit", type=int, default=4)
    args = parser.parse_args()
    root = Path(args.root).resolve()
    directory = retention.safe_path(root, args.state_dir or root / "ops/codex-ops")
    try:
        if not 1 <= args.limit <= 32:
            raise ValueError("bounded workspace limit required")
        if args.command == "sweep":
            result = sweep(root, directory, args.apply, args.limit)
        elif args.command == "compress":
            result = compress(root, directory, args.batch, Path(args.scratch), args.apply)
        elif args.command == "restore-copies":
            if not retention.BATCH.fullmatch(args.batch or ""):
                raise ValueError("invalid batch")
            result = restore_copies(root, directory, args.batch)
        else:
            tree = retention.safe_path(root, root / ".worktrees" / (args.workspace or ""))
            result = (thin(root, directory, tree, args.apply) if args.command == "thin" else
                      materialize(root, directory, tree, args.path))
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
        print(json.dumps({"state": "retained", "reason": str(error)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
