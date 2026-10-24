#!/usr/bin/env python3
"""Retire published, idle workspaces while keeping verified unique artifacts and source refs."""
import argparse
import datetime as dt
import fnmatch
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parent))
import learner_retention as retention
from learner_checks import SOURCE_PATHS
from instance_env import binding_env

NAME = re.compile(r"[a-z][a-z0-9-]{1,95}")
PROTECTED = {"live", "exp", "regent-climb"}
TERMINAL = {"done", "completed", "complete", "shipped"}


def git(root, *args):
    return retention.git(root, *args)


def registered(root):
    rows = []
    for block in git(root, "worktree", "list", "--porcelain").decode().split("\n\n"):
        row = dict(line.split(" ", 1) if " " in line else (line, True) for line in block.splitlines())
        if "worktree" in row:
            rows.append(row)
    return rows


def active(path, ignore_pid=None):
    """Check cwd and program references, without reading environments or exposing command lines."""
    if retention.active_cwd(path):
        return True
    prefix = str(path).encode()
    for proc in Path("/proc").iterdir():
        if not proc.name.isdigit():
            continue
        if ignore_pid is not None and proc.name == str(ignore_pid):
            continue
        try:
            args = (proc / "cmdline").read_bytes().split(b"\0")
            if any(arg == prefix or arg.startswith(prefix + b"/") for arg in args):
                return True
        except OSError:
            continue
    return False


def bound(value, tree, root):
    if isinstance(value, dict):
        return any(bound(v, tree, root) for v in value.values())
    if isinstance(value, list):
        return any(bound(v, tree, root) for v in value)
    if isinstance(value, str):
        return any(value == p or value.startswith(p + "/") for p in (str(tree), str(tree.relative_to(root))))
    return False


def owner_guard(root, directory, tree):
    state = retention.load(directory / "learn.json") if (directory / "learn.json").is_file() else {}
    owners = [(k, b) for k, b in state.get("batches", {}).items() if Path(b.get("worktree") or root) == tree]
    keep_all_originals = False
    if owners:
        # The learner's stricter ingestion and full-check protocol remains authoritative.
        for ident, batch in owners:
            if batch.get("state") == "running":
                raise ValueError("active learner owner retained")
        latest, _ = owners[-1]
        _, _, _, proof = retention.admission(root, directory, state, latest, check_ignored=False)
        keep_all_originals = not proof["compact_scratch"]
    paths = list((root / "notes/learning-requests").glob("*.json"))
    paths += list((root / "notes").glob("*dispatch*.json"))
    paths += list((root / "notes").glob("strategy-*.json"))
    for path in paths:
        if path.is_symlink() or retention.secret_name(path):
            raise ValueError("unverifiable request metadata retained")
        if bound(retention.load(path), tree, root):
            raise ValueError("original request or continuation reference retained")
    return owners, keep_all_originals


def executable(path):
    return path.startswith(("knowledge/characters/", "knowledge/common/", "ops/tests/")) or any(
        path == pattern or path.startswith(pattern + "/") or fnmatch.fnmatch(path, pattern) for pattern in SOURCE_PATHS)


def instance_guard(root, tree):
    """Exclude a byte-identical inherited primary binding, never infer idle from a PID alone."""
    marker = "ops/instance-binding.json"
    path = retention.safe_path(root, tree / marker)
    if not path.exists():
        return {"kind": "no-local-binding"}
    if not path.is_file() or path.stat().st_size > 65536:
        raise ValueError("unknown instance binding retained")
    raw = path.read_bytes()
    value = json.loads(raw)
    binding_env(value)
    # A new/changed binding or an explicit local scope is an instance identity, not an inherited copy.
    if (git(tree, "ls-files", "--", marker).decode().strip() != marker
            or git(tree, "show", "HEAD:" + marker) != raw or bound(value, tree, root)):
        raise ValueError("local or conflicting instance binding retained")
    # Research/cache directories are not runtime identities. Private controller leases are.
    for relative in ("ops/codex-ops/session-id", "ops/codex-ops/autoplay.pid",
                     "ops/codex-ops/instance-binding.json", "ops/regent-lane.json"):
        local = tree / relative
        if local.exists() or local.is_symlink():
            raise ValueError("independent runtime identity retained")
    canonical = [root, root / ".worktrees/live"]
    registered_paths = {r["worktree"] for r in registered(root)}
    for runtime in canonical:
        original = retention.safe_path(root, runtime / marker)
        if (runtime == tree or str(runtime) not in registered_paths or not original.is_file()
                or original.stat().st_size > 65536 or original.read_bytes() != raw):
            continue
        retention.require_host_process_view()
        session = retention.safe_path(root, root / "ops/codex-ops/session-id")
        if (not session.is_file() or not session.read_text().strip()
                or not (active(root / "ops") or active(runtime / "agent"))):
            raise ValueError("primary runtime session/process identity unknown; retained")
        if active(tree):
            raise ValueError("active workspace process retained")
        # Keep exact provenance and the independently registered primary runtime in the deletion proof.
        return {"kind": "inherited-primary-binding", "runtime": str(runtime),
                "sha256": hashlib.sha256(raw).hexdigest(),
                "head_blob": git(tree, "rev-parse", "HEAD:" + marker).decode().strip()}
    raise ValueError("unknown or conflicting instance identity retained")


def allocation_base(root, directory, tree):
    path = directory / "retention/allocations" / (tree.name + ".json")
    if not path.is_file():
        return None
    record = retention.load(retention.safe_path(root, path))
    if (record.get("schema") != "workspace-allocation-v1" or record.get("root") != str(root)
            or record.get("worktree") != str(tree) or record.get("branch") != tree.name
            or record.get("state") != "allocated"):
        raise ValueError("original allocation receipt mismatch")
    return record["base"]


def source_admission(root, directory, tree, head, *, allow_leaf=False):
    """A main-only report may retire; executable task deltas still require real live publication."""
    in_main = retention.ancestor(root, head)
    if not in_main and not allow_leaf:
        raise ValueError("workspace source unpublished in main")
    branch = git(tree, "symbolic-ref", "HEAD").decode().strip()
    if not branch.startswith("refs/heads/") or git(root, "rev-parse", branch).decode().strip() != head:
        raise ValueError("source branch reference not preserved")
    live = retention.safe_path(root, os.environ.get("STS2_LIVE") or root / ".worktrees/live")
    live_commit = git(live, "rev-parse", "HEAD").decode().strip()
    proof = acceptance(root, tree, head, git(root, "rev-parse", "HEAD").decode().strip(),
                       live_commit, allocation_base(root, directory, tree))
    if not in_main and not proof["live_required"]:
        raise ValueError("workspace source unpublished in main")
    return proof


def acceptance(root, tree, source, main_commit, live_commit, allocation_base=None):
    if not all(retention.SHA.fullmatch(x or "") for x in (source, main_commit, live_commit)):
        raise ValueError("full source and publication SHAs required")
    live = retention.safe_path(root, os.environ.get("STS2_LIVE") or root / ".worktrees/live")
    if not retention.ancestor(root, main_commit) or not retention.ancestor(live, live_commit):
        raise ValueError("publication is not in this runtime's main/live")
    if git(tree, "rev-parse", "HEAD").decode().strip() != source:
        raise ValueError("source differs from workspace HEAD")
    # Without an original allocation, use the live fork rather than treating source==main as an empty delta.
    base = allocation_base or git(root, "merge-base", source, live_commit).decode().strip()
    if not retention.SHA.fullmatch(base) or subprocess.run(
            ["git", "-C", str(root), "merge-base", "--is-ancestor", base, source], capture_output=True).returncode:
        raise ValueError("allocation baseline is not in the source history")
    changed = git(root, "diff", "--name-only", base, source).decode().splitlines()
    includes_source = {published: subprocess.run(
        ["git", "-C", str(root), "merge-base", "--is-ancestor", source, published],
        capture_output=True).returncode == 0 for published in (main_commit, live_commit)}
    checked = []
    for name in changed:
        if retention.secret_name(name) and not name.endswith(".env.example"):
            raise ValueError("protected source change retained")
        if not executable(name):
            continue
        for published in (main_commit, live_commit):
            if includes_source[published]:
                continue
            # Compare object IDs, not executable source contents or a caller-provided passed flag.
            expected = git(root, "ls-tree", source, "--", name)
            actual = git(root, "ls-tree", published, "--", name)
            if actual != expected:
                raise ValueError("source leaf not in recorded publication: " + name)
        checked.append(name)
    return {"source": source, "base": base, "main_commit": main_commit, "live_commit": live_commit,
            "verified_source_paths": checked, "live_required": bool(checked),
            "scope": "workspace-only; no parent request or gameplay claim closed"}


def complete(root, directory, name, source, main_commit, live_commit):
    tree = checked_tree(root, name)
    allocation = directory / "retention/allocations" / (name + ".json")
    base = None
    if allocation.is_file():
        record = retention.load(retention.safe_path(root, allocation))
        if (record.get("schema") != "workspace-allocation-v1" or record.get("root") != str(root)
                or record.get("worktree") != str(tree) or record.get("branch") != name
                or record.get("state") != "allocated"):
            raise ValueError("original allocation receipt mismatch")
        base = record["base"]
    proof = acceptance(root, tree, source, main_commit, live_commit, base)
    if base is not None:
        proof.update(allocation_receipt=str(allocation.relative_to(root)), allocation_sha256=retention.sha_file(allocation))
    record = {"schema": "workspace-lifecycle-v1", "root": str(root), "worktree": str(tree),
              "state": "accepted", "at": retention.stamp(), "acceptance": proof}
    retention.atomic(directory / "retention/workspaces" / (name + ".json"), record)
    return record


def checked_tree(root, name):
    if not NAME.fullmatch(name or "") or name in PROTECTED or name.startswith("exp-"):
        raise ValueError("protected or invalid workspace")
    tree = retention.safe_path(root, root / ".worktrees" / name)
    if (tree / "ops/regent-lane.json").exists():
        raise ValueError("persistent game instance retained")
    instance_guard(root, tree)
    return tree


def dependency(root, tree, path):
    relative = str(path.relative_to(tree))
    allowed = {"agent/node_modules": root / "agent/node_modules", "data/logdb-venv": root / "data/logdb-venv",
               "data": root / "data", "logs": root / "logs"}
    if relative not in allowed or path.resolve() != allowed[relative].resolve():
        raise ValueError("unknown workspace symlink retained")
    return {"path": str(path.relative_to(root)), "target": os.readlink(path)}


def inventory(root, tree):
    files, links, cache = [], [], []
    for raw in git(tree, "ls-files", "--others", "--ignored", "--exclude-standard", "-z").split(b"\0"):
        if not raw:
            continue
        name = os.fsdecode(raw)
        path = tree / name
        if retention.secret_name(path):
            raise ValueError("credential-named path retained without reading")
        if path.is_symlink():
            links.append(dependency(root, tree, path))
            continue
        path = retention.safe_path(root, path)
        if not path.is_file():
            raise ValueError("non-regular ignored artifact retained")
        if "__pycache__" in path.parts and path.suffix == ".pyc":
            source = retention.python_cache_source(tree, path)
            if source is None:
                raise ValueError("unknown Python bytecode retained")
            cache.append({"path": str(path.relative_to(root)), "source": str(source.relative_to(root)),
                          "bytes": path.stat().st_size})
        elif path.suffix == ".tsbuildinfo":
            cache.append({"path": str(path.relative_to(root)), "bytes": path.stat().st_size})
        else:
            files.append(path)
    return sorted(files), links, cache


def admission(root, directory, tree):
    checked_tree(root, tree.name)
    rows = [r for r in registered(root) if r["worktree"] == str(tree)]
    if len(rows) != 1 or rows[0].get("locked") or not rows[0].get("branch"):
        raise ValueError("unregistered, detached or locked workspace retained")
    if active(tree):
        raise ValueError("active workspace process retained")
    if git(tree, "status", "--porcelain", "--untracked-files=all"):
        raise ValueError("dirty workspace retained")
    record_path = directory / "retention/workspaces" / (tree.name + ".json")
    head = rows[0]["HEAD"]
    source_proof = None
    if record_path.exists():
        record = retention.load(record_path)
        if record.get("root") != str(root) or record.get("worktree") != str(tree) or record.get("state") != "accepted":
            raise ValueError("workspace acceptance incomplete")
        p = record["acceptance"]
        base = None
        if p.get("allocation_receipt"):
            allocation = retention.safe_path(root, p["allocation_receipt"])
            expected = directory / "retention/allocations" / (tree.name + ".json")
            if (allocation != expected or retention.sha_file(allocation) != p["allocation_sha256"]
                    or retention.load(allocation).get("base") != p["base"]):
                raise ValueError("accepted allocation receipt changed")
            base = p["base"]
        source_proof = acceptance(root, tree, p["source"], p["main_commit"], p["live_commit"], base)
    elif (directory / "retention/allocations" / (tree.name + ".json")).exists() and tree.name.startswith("ops-"):
        # An untouched allocation is not completion. A changed source must independently
        # satisfy the existing real main/live publication and original baseline checks.
        base = allocation_base(root, directory, tree)
        if head == base:
            raise ValueError("allocated ops workspace needs explicit completion acceptance")
        source_proof = source_admission(root, directory, tree, head, allow_leaf=True)
    elif tree.name.startswith("ops-"):
        if time.time() - (tree / ".git").stat().st_mtime < 3600:
            raise ValueError("recent unregistered ops allocation retained")
        source_proof = source_admission(root, directory, tree, head)
    elif tree.name.startswith(("codex-fix-", "codex-strategy-")):
        source_proof = source_admission(root, directory, tree, head)
    else:
        raise ValueError("explicit workspace acceptance required")
    owners, keep_all_originals = owner_guard(root, directory, tree)
    files, links, cache = inventory(root, tree)
    return {"worktree_head": head, "worktree_branch": rows[0]["branch"], "worktree": str(tree),
            "retire_checkout": True, "links": links, "discarded_cache": cache,
            "learner_owners": [i for i, _ in owners], "preserve_all_originals": keep_all_originals,
            "source_acceptance": source_proof, "instance": instance_guard(root, tree)}, files


def project_evidence(root, manifest, staging):
    import tarfile
    with tarfile.open(root / manifest["archive"], "r:gz") as archive:
        for member, item in zip(archive.getmembers(), manifest["files"]):
            p = Path(item["path"])
            # Keep reports and original accounting/event streams at their original paths.
            keep = (manifest["proof"].get("preserve_all_originals") or p.suffix in (".jsonl", ".out", ".err", ".log")
                    or (p.suffix in (".md", ".json", ".py", ".ts", ".sh") and item["bytes"] <= retention.SMALL))
            if keep:
                dest = staging / p
                dest.parent.mkdir(parents=True, exist_ok=True)
                with archive.extractfile(member) as source, dest.open("xb") as output:
                    shutil.copyfileobj(source, output)
                if retention.sha_file(dest) != item["sha256"]:
                    raise ValueError("retained evidence projection differs")


def verified_archive(root, manifest):
    import tarfile
    path = retention.safe_path(root, manifest["archive"])
    if manifest.get("root") != str(root) or retention.sha_file(path) != manifest["archive_sha256"]:
        raise ValueError("workspace archive identity or hash changed")
    with tarfile.open(path, "r:gz") as archive:
        members = archive.getmembers()
        if [m.name for m in members] != [f["path"] for f in manifest["files"]] or not all(m.isfile() for m in members):
            raise ValueError("workspace archive members changed")
        tree = checked_tree(root, Path(manifest["proof"]["worktree"]).name)
        if str(tree) != manifest["proof"]["worktree"]:
            raise ValueError("workspace archive owner changed")
        seen = set()
        for member, item in zip(members, manifest["files"]):
            dest = retention.safe_path(root, item["path"])
            if (not dest.is_relative_to(tree) or dest == tree or ".git" in dest.relative_to(tree).parts
                    or retention.secret_name(dest) or item["path"] in seen):
                raise ValueError("unsafe workspace archive member")
            seen.add(item["path"])
            with archive.extractfile(member) as stream:
                digest = hashlib.file_digest(stream, "sha256").hexdigest()
            if member.size != item["bytes"] or digest != item["sha256"]:
                raise ValueError("workspace member hash changed")
        for link in manifest["proof"]["links"]:
            dest = root / link["path"]
            retention.safe_path(root, dest.parent)
            allowed = {"agent/node_modules": root / "agent/node_modules", "data/logdb-venv": root / "data/logdb-venv",
                       "data": root / "data", "logs": root / "logs"}
            if ".." in dest.parts or not dest.is_relative_to(tree):
                raise ValueError("unsafe restored dependency reference")
            relative = str(dest.relative_to(tree))
            if relative not in allowed or (dest.parent / link["target"]).resolve() != allowed[relative].resolve():
                raise ValueError("unsafe restored dependency reference")


def clear_own_projection(root, staging, manifest):
    """Discard only byte-verified copies from this archive, never a changed or unknown staging file."""
    if not staging.exists():
        return
    expected = {f["path"]: f["sha256"] for f in manifest["files"]}
    for path in retention.files_under(root, staging):
        if expected.get(str(path.relative_to(staging))) != retention.sha_file(path):
            raise ValueError("changed or unknown staging evidence retained")
    shutil.rmtree(staging)


def reclaim(root, directory, name, apply=False):
    tree = checked_tree(root, name)
    proof, files = admission(root, directory, tree)
    result = {"workspace": name, "state": "eligible", "unique_bytes": sum(p.stat().st_size for p in files),
              "cache_bytes": sum(p["bytes"] for p in proof["discarded_cache"])}
    if not apply:
        return result
    base = directory / "retention/worktree-archives" / name
    before = shutil.disk_usage(root).free
    with retention.locks([directory / "learner" / (name + ".lock")]):
        manifest_path = base.with_suffix(".manifest.json")
        if manifest_path.exists():
            manifest = retention.load(manifest_path)
            if manifest.get("state") != "archived_not_reclaimed" or manifest.get("proof") != proof:
                raise ValueError("prior workspace archive needs acceptance or explicit restore")
            verified_archive(root, manifest)
            if [str(p.relative_to(root)) for p in files] != [f["path"] for f in manifest["files"]] or any(
                    retention.sha_file(p) != f["sha256"] for p, f in zip(files, manifest["files"])):
                raise ValueError("original workspace evidence changed after archival")
        else:
            temporary = base.with_suffix(".tar.gz.tmp")
            if temporary.exists():
                if temporary.is_symlink() or not temporary.is_file():
                    raise ValueError("unknown archive staging retained")
                temporary.unlink()
            manifest, manifest_path = retention.archive(root, base, tree, files, proof)
        staging = directory / "retention/staging" / ("workspace-" + name)
        clear_own_projection(root, staging, manifest)
        staging.mkdir(parents=True)
        project_evidence(root, manifest, staging)
        with retention.locks([directory / "learn.lock", root / "ops/live-merge.lock"]):
            current, current_files = admission(root, directory, tree)
            if current != proof or current_files != files or any(retention.sha_file(p) != item["sha256"] for p, item in zip(files, manifest["files"])):
                raise ValueError("workspace changed after archival")
            git(root, "worktree", "remove", str(tree))
            for parent, _, names in os.walk(staging):
                for filename in names:
                    source = Path(parent) / filename
                    dest = root / source.relative_to(staging)
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    os.replace(source, dest)
            shutil.rmtree(staging)
        manifest.update(state="reclaimed", completed_at=retention.stamp(), branch_retained=True,
                        original_reports_and_stream_paths_kept=True, available_bytes_delta=shutil.disk_usage(root).free - before)
        retention.atomic(manifest_path, manifest)
        for ident in proof["learner_owners"]:
            retention.request_outcome(root, directory, ident, {
                "state": "checkout_reclaimed", "workspace_manifest": str(manifest_path.relative_to(root)),
                "workspace_manifest_sha256": retention.sha_file(manifest_path), "no_parent_request_closed": True})
    return dict(result, state="reclaimed", available_bytes_delta=manifest["available_bytes_delta"])


def finish_interrupted_removal(root, directory, path):
    manifest = retention.load(path)
    if manifest.get("state") != "archived_not_reclaimed":
        return None
    proof = manifest["proof"]
    tree = checked_tree(root, Path(proof["worktree"]).name)
    if (tree / ".git").exists() or any(r["worktree"] == str(tree) for r in registered(root)):
        return None
    if active(tree) or git(root, "rev-parse", proof["worktree_branch"]).decode().strip() != proof["worktree_head"]:
        raise ValueError("interrupted removal owner or source changed")
    verified_archive(root, manifest)
    expected = {f["path"]: f["sha256"] for f in manifest["files"]}
    if tree.exists():
        for p in retention.files_under(root, tree):
            if expected.get(str(p.relative_to(root))) != retention.sha_file(p):
                raise ValueError("interrupted removal has unknown or changed evidence")
    staging = directory / "retention/staging" / ("workspace-" + tree.name)
    clear_own_projection(root, staging, manifest)
    staging.mkdir(parents=True)
    project_evidence(root, manifest, staging)
    for parent, _, names in os.walk(staging):
        for name in names:
            source = Path(parent) / name
            dest = root / source.relative_to(staging)
            dest.parent.mkdir(parents=True, exist_ok=True)
            os.replace(source, dest)
    shutil.rmtree(staging)
    manifest.update(state="reclaimed", recovered_at=retention.stamp(), branch_retained=True,
                    recovered_after_checkout_removal=True, available_bytes_delta=0)
    retention.atomic(path, manifest)
    return {"workspace": tree.name, "state": "reclaimed", "recovered_after_checkout_removal": True}


def sweep(root, directory, apply=False, limit=4):
    limit = min(limit, 4)
    out = {"at": retention.stamp(), "results": [], "retained": {}}
    if apply:
        for path in (directory / "retention/worktree-archives").glob("*.manifest.json"):
            try:
                item = finish_interrupted_removal(root, directory, path)
                if item:
                    out["results"].append(item)
            except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
                reason = str(error)
                out["retained"][reason] = out["retained"].get(reason, 0) + 1
            if len(out["results"]) >= limit:
                retention.atomic(directory / "retention/last-worktree-sweep.json", out)
                return out
    for row in registered(root):
        tree = Path(row["worktree"])
        if tree.parent != root / ".worktrees" or tree.name in PROTECTED:
            continue
        if not (tree.name.startswith(("ops-", "codex-fix-", "codex-strategy-")) or
                (directory / "retention/workspaces" / (tree.name + ".json")).is_file()):
            continue
        try:
            item = reclaim(root, directory, tree.name, apply)
        except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
            reason = str(error)
            out["retained"][reason] = out["retained"].get(reason, 0) + 1
            continue
        out["results"].append(item)
        if len(out["results"]) >= limit:
            break
    retention.atomic(directory / "retention/last-worktree-sweep.json", out)
    return out


def restore(root, directory, name):
    tree = checked_tree(root, name)
    manifest = retention.load(directory / "retention/worktree-archives" / (name + ".manifest.json"))
    if manifest.get("root") != str(root) or manifest.get("state") != "reclaimed" or manifest["proof"]["worktree"] != str(tree):
        raise ValueError("workspace archive identity mismatch")
    verified_archive(root, manifest)
    branch = manifest["proof"]["worktree_branch"]
    if git(root, "rev-parse", branch).decode().strip() != manifest["proof"]["worktree_head"] or active(tree):
        raise ValueError("workspace branch or owner changed")
    import tarfile
    with tarfile.open(root / manifest["archive"], "r:gz") as archive:
        members = archive.getmembers()
        if [m.name for m in members] != [f["path"] for f in manifest["files"]] or not all(m.isfile() for m in members):
            raise ValueError("archive member mismatch")
        for item in manifest["files"]:
            dest = retention.safe_path(root, item["path"])
            if dest.exists() and retention.sha_file(dest) != item["sha256"]:
                raise ValueError("existing evidence changed")
        expected = {f["path"]: f["sha256"] for f in manifest["files"]}
        if tree.exists():
            for existing in retention.files_under(root, tree):
                if expected.get(str(existing.relative_to(root))) != retention.sha_file(existing):
                    raise ValueError("unknown existing projection retained")
        staging = directory / "retention/staging" / ("restore-workspace-" + name)
        if staging.exists() or (tree / ".git").exists():
            raise ValueError("existing workspace or restore staging retained")
        if tree.exists():
            os.rename(tree, staging)
        try:
            if (root / "ops/worktree_storage.py").is_file():
                import worktree_checkout
                worktree_checkout.restore_checkout(root, tree, branch.removeprefix("refs/heads/"))
            else:
                git(root, "worktree", "add", str(tree), branch.removeprefix("refs/heads/"))
        except Exception:
            if staging.exists() and not tree.exists():
                os.rename(staging, tree)
            raise
        for member, item in zip(members, manifest["files"]):
            dest = retention.safe_path(root, item["path"])
            dest.parent.mkdir(parents=True, exist_ok=True)
            with archive.extractfile(member) as source, dest.open("wb") as output:
                shutil.copyfileobj(source, output)
            if retention.sha_file(dest) != item["sha256"]:
                raise ValueError("restored evidence differs")
            dest.chmod(item["mode"])
        for link in manifest["proof"]["links"]:
            dest = retention.safe_path(root, link["path"])
            allowed = {"agent/node_modules": root / "agent/node_modules", "data/logdb-venv": root / "data/logdb-venv",
                       "data": root / "data", "logs": root / "logs"}
            relative = str(dest.relative_to(tree))
            if relative not in allowed or (dest.parent / link["target"]).resolve() != allowed[relative].resolve():
                raise ValueError("unsafe restored dependency reference")
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.symlink_to(link["target"])
        if staging.exists():
            shutil.rmtree(staging)
    manifest.update(state="restored", restored_at=retention.stamp())
    retention.atomic(directory / "retention/worktree-archives" / (name + ".manifest.json"), manifest)
    return {"workspace": name, "state": "restored", "source_ref_kept": True}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("command", choices=["plan", "sweep", "complete", "restore"])
    p.add_argument("--root", default=os.environ.get("CODEX_OPS_ROOT") or Path(__file__).resolve().parents[1])
    p.add_argument("--state-dir")
    p.add_argument("--workspace")
    p.add_argument("--source")
    p.add_argument("--main-commit")
    p.add_argument("--live-commit")
    p.add_argument("--apply", action="store_true")
    p.add_argument("--limit", type=int, default=4)
    a = p.parse_args();root = Path(a.root).resolve();directory = retention.safe_path(root, a.state_dir or root / "ops/codex-ops")
    if not 1 <= a.limit <= 32 or (a.command == "plan" and a.apply):
        p.error("invalid bounded limit or mutating plan")
    try:
        if a.apply or a.command == "restore":
            retention.require_host_process_view()
        with retention.locks([directory / "retention.lock"]):
            if a.command == "complete":
                result = complete(root, directory, a.workspace, a.source, a.main_commit, a.live_commit)
            elif a.command == "restore":
                result = restore(root, directory, a.workspace)
            elif a.workspace:
                result = reclaim(root, directory, a.workspace, a.apply)
            else:
                result = sweep(root, directory, a.apply, a.limit)
        print(json.dumps(result, ensure_ascii=False));return 0
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
        print(json.dumps({"state": "retained", "reason": str(error)}, ensure_ascii=False));return 1


if __name__ == "__main__":
    raise SystemExit(main())
