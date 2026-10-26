#!/usr/bin/env python3
"""Reclaim settled learner copies after preserving a verified, restorable evidence archive."""
import argparse
from contextlib import contextmanager
import datetime as dt
import fcntl
import fnmatch
from functools import lru_cache
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
import time
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent))
from learner_checks import read_report

BATCH = re.compile(r"[0-9]{8}-[0-9]{6}(?:-(?:s2-)?(?:experience-update|fix-batch|strategy-proposal|ascension-audit|mechanics-audit|experience-asc-audit))?")
SCRATCH = re.compile(r"[0-9]{8}-[0-9]{6}-(?:[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}-)?[a-z][a-z0-9-]*")
SHA = re.compile(r"[0-9a-f]{40}")
SMALL = 128 * 1024


def stamp():
    return dt.datetime.now().astimezone().isoformat(timespec="seconds")


def load(path):
    return json.loads(Path(path).read_bytes())


def atomic(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    with tmp.open("w") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(tmp, path)


def git(root, *args):
    result = subprocess.run(["git", "-C", str(root), *args], capture_output=True, timeout=60)
    if result.returncode:
        raise ValueError("git " + args[0] + " refused")
    return result.stdout


def ancestor(repo, commit):
    return bool(SHA.fullmatch(commit or "")) and subprocess.run(
        ["git", "-C", str(repo), "merge-base", "--is-ancestor", commit, "HEAD"],
        capture_output=True, timeout=20).returncode == 0


def safe_path(root, path):
    path = Path(path)
    path = path if path.is_absolute() else root / path
    if not path.is_relative_to(root) or ".." in path.parts:
        raise ValueError("path outside this runtime")
    current = root
    for part in path.relative_to(root).parts:
        current /= part
        if current.is_symlink():
            raise ValueError("symlink path retained")
    return path


def secret_name(path):
    return any(fnmatch.fnmatch(part.lower(), pattern) for part in Path(path).parts
               for pattern in [".env", ".env.*", "*.env", "auth.json", ".jev_api_keys", ".deepseek_api_key",
                               ".sts2-jev-env*", "*.pem", "*.key"])


def python_cache_source(tree, path):
    """Only standard CPython caches with a present, tracked source are reconstructible."""
    path = safe_path(tree, path)
    if (path.parent.name != "__pycache__" or not path.is_file()
            or not re.fullmatch(r".+\.cpython-\d+(?:\.opt-[012])?\.pyc", path.name)):
        return None
    try:
        source = safe_path(tree, importlib.util.source_from_cache(str(path)))
        if secret_name(source) or not source.is_file():
            return None
        relative = str(source.relative_to(tree))
        if git(tree, "ls-files", "--error-unmatch", "-z", "--", relative) != os.fsencode(relative) + b"\0":
            return None
    except ValueError:
        return None
    return source


@contextmanager
def locks(paths):
    handles = []
    try:
        for path in sorted(set(Path(p) for p in paths)):
            path.parent.mkdir(parents=True, exist_ok=True)
            handle = path.open("a")
            handles.append(handle)
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield
    finally:
        for handle in reversed(handles):
            handle.close()


def request_guard(root, state, tree, batch_id):
    for rec in state.get("learning_requests", {}).values():
        if batch_id in [rec.get("original_batch"), rec.get("batch"), rec.get("verified_batch")] or batch_id in rec.get("attempts", []):
            return True
    # Even completed requests retain their original thread/cwd for later revisions.
    paths = list((root / "notes/learning-requests").glob("*.json"))
    paths += list((root / "notes").glob("strategy-*.json"))
    paths += list((root / "notes").glob("*dispatch*.json"))
    for path in paths:
        if secret_name(path):
            continue
        value = load(path)
        def bound(item):
            if isinstance(item, dict):
                return item.get("original_batch") == batch_id or any(bound(v) for v in item.values())
            if isinstance(item, list):
                return any(bound(v) for v in item)
            return False
        def tree_bound(item):
            if isinstance(item, dict):
                return any(k in ("worktree", "cwd", "source_worktree") and v in (str(tree), str(tree.relative_to(root)))
                           for k, v in item.items() if isinstance(v, str)) or any(tree_bound(v) for v in item.values())
            return isinstance(item, list) and any(tree_bound(v) for v in item)
        if bound(value) or tree_bound(value):
            return True
    return False


def successful_checks(batch):
    records = list(batch.get("fallback_checks", []))
    if not records and isinstance(batch.get("checks"), dict):
        records = [batch["checks"]]
    return records[-1] if records and records[-1].get("rc") == 0 else None


def check_log_completed(root, check):
    path = safe_path(root, check.get("log", ""))
    if not path.is_file() or secret_name(path):
        return False
    text = re.sub(rb"\x1b\[[0-9;]*m", b"", path.read_bytes())
    return bool(re.search(rb"Test Files\s+\d+ passed", text))


def evidence_runs(exp):
    runs = set(exp.get("source", {}).get("runs", [])) if isinstance(exp.get("source"), dict) else set()
    for entry in exp.get("entries", []):
        for evidence in entry.get("evidence", []):
            run = evidence.get("run") if isinstance(evidence, dict) else evidence
            if isinstance(run, str) and re.fullmatch("[0-9A-Z]{12}", run):
                runs.add(run)
    return runs


@lru_cache(maxsize=2048)
def checked_experience(live, commit, character):
    if not ancestor(live, commit):
        return None
    try:
        return json.loads(git(live, "show", commit + ":knowledge/characters/" + character + "/experience.json"))
    except (ValueError, json.JSONDecodeError):
        return None


def legacy_experience_scratch(root, state_dir, tree, batch_id, batch, report):
    """Bind an old root-level experience scratch to its original launch and completion."""
    if (batch.get("task") != "experience-update" or batch.get("state") != "done"
            or tree != root / ".worktrees" / "exp"):
        raise ValueError("legacy scratch owner retained")
    scratch = safe_path(root, root / "learner/runs" / batch_id)
    event = safe_path(root, scratch.with_suffix(".jsonl"))
    saved = safe_path(root, scratch / "report.json")
    commit_file = safe_path(root, scratch / "commit.txt")
    output = safe_path(root, state_dir / "learner" / (batch_id + ".out"))
    if (not scratch.is_dir() or not SCRATCH.fullmatch(scratch.name)
            or any(not path.is_file() or path.stat().st_size > limit for path, limit in
                   [(saved, 1048576), (commit_file, 256), (output, 2097152)])):
        raise ValueError("legacy scratch completion missing or oversized")
    with event.open("rb") as handle:
        header = handle.readline(131073)
        if len(header) > 131072:
            raise ValueError("legacy launch header oversized")
        launch = json.loads(header)
        thread, thread_raw = None, b""
        for _ in range(32):
            line = handle.readline(131073)
            if not line or len(line) > 131072:
                break
            row = json.loads(line)
            if isinstance(row, dict) and row.get("type") == "thread.started":
                thread, thread_raw = row.get("thread_id"), line
                break
    params = launch.get("params") if isinstance(launch, dict) else None
    if (not isinstance(params, dict) or launch.get("type") != "learner_launch"
            or launch.get("task") != "experience-update" or launch.get("cwd") != str(tree)
            or params.get("worktree") != str(tree) or params.get("scratch") != str(scratch)
            or params.get("project_root") != str(root) or params.get("character") != batch.get("character")
            or params.get("merge") != "live"
            or params.get("merge_dir") != str(safe_path(root, os.environ.get("STS2_LIVE") or root / ".worktrees/live"))
            or not isinstance(params.get("runs"), str)
            or not isinstance(batch.get("runs"), list)
            or set(params["runs"].split(",")) != set(batch["runs"])):
        raise ValueError("legacy original launch binding mismatch")
    output_raw, saved_raw, commit_raw = output.read_bytes(), saved.read_bytes(), commit_file.read_bytes()
    output_text = output_raw.decode()
    if (not isinstance(thread, str) or not re.fullmatch(r"[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}", thread)
            or not re.search(r"(?:^|[；;])会话[：:]\s*" + re.escape(thread) + r"\s*$", output_text, re.M)
            or not re.search(r"^日志[：:]\s*" + re.escape(str(event)) + r"\s*$", output_text, re.M)):
        raise ValueError("legacy original thread/output binding missing")
    preserved = json.loads(saved_raw)
    tests = report.get("tests", {})
    # Descriptive mechanism wording can differ; publication identity and checks must agree.
    if (not isinstance(preserved, dict)
            or any(preserved.get(key) != report.get(key) for key in ("task", "commit", "merged", "version", "tests", "fixes"))
            or not isinstance(report.get("commit"), str) or not SHA.fullmatch(report["commit"])
            or commit_raw.decode().strip() != report["commit"]
            or not isinstance(tests, dict)
            or any(type(tests.get(key)) is not int or tests[key] != 0 for key in ("tsc", "vitest"))
            or type(tests.get("cases")) is not int or tests["cases"] <= 0):
        raise ValueError("legacy original report/source binding mismatch")
    return scratch, {"legacy_binding": {
        "event": str(event.relative_to(root)), "launch_sha256": hashlib.sha256(header).hexdigest(),
        "thread": thread, "thread_sha256": hashlib.sha256(thread_raw).hexdigest(),
        "output_sha256": hashlib.sha256(output_raw).hexdigest(),
        "report_sha256": hashlib.sha256(saved_raw).hexdigest(),
        "commit_sha256": hashlib.sha256(commit_raw).hexdigest(),
    }}


def admission(root, state_dir, state, batch_id, check_ignored=True):
    if not BATCH.fullmatch(batch_id):
        raise ValueError("invalid batch identity")
    batch = state.get("batches", {}).get(batch_id, {})
    task = batch.get("task", "postmortem")
    pending = state_dir / 'ordinary-close' / (batch_id + '.json')
    if pending.exists():
        receipt = load(safe_path(root, pending))
        if (not isinstance(receipt, dict) or receipt.get('schema') != 'ordinary-close-v1'
                or receipt.get('batch') != batch_id or receipt.get('state') != 'closed'):
            raise ValueError('ordinary completion is not settled; original checkout retained')
        records = receipt.get('records', {})
        commit = records.get('commit') if isinstance(records, dict) else None
        dataset = receipt.get('dataset', {})
        if (not isinstance(commit, str) or not SHA.fullmatch(commit) or not ancestor(root, commit)
                or not isinstance(dataset, dict) or type(dataset.get('rc')) is not int or dataset['rc'] != 0):
            raise ValueError('ordinary completion lacks its actual record commit and dataset result')
    if batch.get("rc") != 0 or batch.get("state") not in ("done", "failed"):
        raise ValueError("running, failed exit, lost or rejected batch retained")
    if batch.get("proposal_audit_errors") or batch.get("proposal_repair_needed") or batch.get("checks_pending"):
        raise ValueError("unfinished verification retained")
    if batch.get("learning_request") or batch.get("research_request") or batch.get("implementation_request") or batch.get("feature_request") or batch.get("boss_sim"):
        raise ValueError("continuation/research owner retained")
    if batch.get("learner_task", task) != task:
        raise ValueError("specialized owner retained")
    tree = safe_path(root, batch.get("worktree") or root)
    if request_guard(root, state, tree, batch_id):
        raise ValueError("original request/thread retained")
    if any(b.get("state") == "running" and Path(b.get("worktree") or root) == tree
           for b in state.get("batches", {}).values()):
        raise ValueError("active shared owner retained")
    live = safe_path(root, os.environ.get("STS2_LIVE") or root / ".worktrees/live")
    report = read_report(str(state_dir / "learner" / (batch_id + ".out")))
    if not report or report.get("task") != task:
        raise ValueError("original final report missing")
    binding = {}
    if task == "experience-update" and not report.get("report"):
        scratch, binding = legacy_experience_scratch(root, state_dir, tree, batch_id, batch, report)
    else:
        scratch = safe_path(root, report.get("report", "")).parent
        if scratch.parent != tree / "learner/runs" or not SCRATCH.fullmatch(scratch.name) or not scratch.is_dir():
            raise ValueError("scratch ownership not bound to original report")
    character = batch.get("character")
    if not re.fullmatch("[a-z][a-z0-9_]*", character or ""):
        raise ValueError("character binding missing")
    proof = {"task": task, "character": character, "original_batch_state": batch["state"], **binding}
    fixes = report.get("fixes", [])
    if not isinstance(fixes, list) or any(not isinstance(fix, dict) for fix in fixes):
        raise ValueError("legacy/malformed fixes report retained")
    sources = [report["commit"]] if report.get("commit") else []
    sources += [fix.get("commit") for fix in fixes]
    document_source = None
    if (len(sources) == 1 and task in ("strategy-proposal", "fix-batch") and batch.get("state") == "done"
            and not fixes and not report.get("merged") and ancestor(root, sources[0])):
        import worktree_retention as workspaces
        head = git(tree, "rev-parse", "HEAD").decode().strip()
        parents = git(root, "rev-list", "--parents", "-n", "1", sources[0]).decode().split()
        # A declared code publication must not be disguised as a report by an empty allocation delta.
        if sources[0] == head and len(parents) == 2 and not any(workspaces.executable(name) for name in
                git(root, "diff", "--name-only", parents[1], head).decode().splitlines()):
            candidate = workspaces.source_admission(root, state_dir, tree, head)
            if not candidate["live_required"]:
                document_source = candidate
    if batch.get("operational_publication"):
        from learning_runtime import selection
        from learning_runtime_store import Store
        chosen = selection(root, batch)
        store = Store(chosen["directory"], readonly=True)
        try:
            receipt = store.completion(batch_id)
            if not receipt or receipt != batch["operational_publication"] or receipt["character"] != character:
                raise ValueError("operational receipt not backed by original database")
            row = store.db.execute("SELECT body FROM completions WHERE id=?", (batch_id,)).fetchone()
            preserved = json.loads(row[0])["report"]
            if sha_file(safe_path(root, preserved["path"])) != preserved["sha256"]:
                raise ValueError("operational report changed")
        finally:
            store.close()
        if sources or report.get("merged") or batch.get("state") != "done":
            raise ValueError("mixed source delivery still requires original publication checks")
        proof.update(kind="recorded-operational-data", operational=receipt, no_experience_claim=True)
    elif document_source:
        proof.update(kind="settled-report-only", no_experience_claim=True, document_source=document_source)
    elif sources:
        check = successful_checks(batch)
        if not check or not ancestor(live, check.get("merged")) or not all(ancestor(live, s) and ancestor(root, s) for s in sources):
            raise ValueError("source not published in main/live with passing full checks")
        check_log = safe_path(root, check.get("log", ""))
        if not check_log.is_file() or secret_name(check_log):
            raise ValueError("original full-check log missing")
        text = re.sub(rb"\x1b\[[0-9;]*m", b"", check_log.read_bytes())
        if not re.search(rb"Test Files\s+\d+ passed", text):
            raise ValueError("full-check log has no completion summary")
        if not all(subprocess.run(["git", "-C", str(live), "merge-base", "--is-ancestor", s, check["merged"]],
                                  capture_output=True, timeout=20).returncode == 0 for s in sources):
            raise ValueError("checked publication does not include every source")
        proof.update(kind="published-source", sources=sources, full_check=check)
        if task == "experience-update":
            exp = checked_experience(str(live), check["merged"], character)
            if exp is None or not batch.get("runs") or not set(batch["runs"]) <= evidence_runs(exp):
                raise ValueError("reported runs missing from published experience")
            proof.update(experience_version=exp["version"], runs=batch["runs"])
    elif task == "postmortem":
        runs = report.get("appended", [])
        if batch.get("state") != "done" or not runs or report.get("bugs") or batch.get("missing"):
            raise ValueError("postmortem not settled")
        lessons = git(root, "show", "HEAD:notes/lessons.md")
        if not all(re.search(rb"^## " + run.encode(), lessons, re.M) for run in runs):
            raise ValueError("postmortem not recorded in main")
        # A written postmortem is not yet an experience ingestion. Bind it to a tested publication containing its runs.
        for other in reversed(list(state.get("batches", {}).values())):
            check = successful_checks(other)
            if other.get("task") != "experience-update" or other.get("character") != character or not check:
                continue
            if not check_log_completed(root, check):
                continue
            exp = checked_experience(str(live), check.get("merged"), character)
            if exp is None:
                continue
            if set(runs) <= evidence_runs(exp):
                proof.update(kind="experience-ingested-postmortem", runs=runs, experience_version=exp["version"], full_check=check)
                break
        else:
            raise ValueError("postmortem has not entered tested live experience")
    elif task in ("strategy-proposal", "fix-batch") and batch.get("state") == "done" and not report.get("merged") and not report.get("fixes"):
        proof.update(kind="settled-report-only", no_experience_claim=True)
    else:
        raise ValueError("no verified ingestion or settled outcome")
    retired = tree.parent == root / ".worktrees" and tree.name in (
        "codex-fix-" + character + "-" + batch_id.removesuffix("-fix-batch"),
        "codex-strategy-" + character + "-" + batch_id.removesuffix("-strategy-proposal"),
        "codex-mechanics-audit-" + character + "-" + batch_id.removesuffix("-mechanics-audit"),
        "codex-experience-asc-audit-" + character + "-" + batch_id.removesuffix("-experience-asc-audit"))
    if tree != root and tree.parent != root / ".worktrees":
        raise ValueError("foreign runtime/worktree retained")
    if tree != root and not retired and tree.name not in ("exp", "exp-" + character):
        raise ValueError("unregistered or other-character worktree retained")
    if retired:
        import worktree_retention as workspaces
        workspaces.checked_tree(root, tree.name)
        if workspaces.active(tree):
            raise ValueError("active process cwd or program reference retained")
        if git(tree, "status", "--porcelain", "--untracked-files=all"):
            raise ValueError("dirty/uncommitted worktree retained")
        head = git(tree, "rev-parse", "HEAD").decode().strip()
        proof["source_acceptance"] = workspaces.source_admission(root, state_dir, tree, head)
        proof["instance"] = workspaces.instance_guard(root, tree)
        caches = []
        # Other ignored files are not part of this batch's scratch. Never delete them accidentally.
        for name in (git(tree, "ls-files", "--others", "--ignored", "--exclude-standard", "-z") if check_ignored else b"").split(b"\0"):
            if not name:
                continue
            path = tree / os.fsdecode(name)
            if secret_name(path):
                raise ValueError("credential-named path retained without reading")
            if (not path.is_relative_to(scratch) and path.parent.name == "__pycache__"
                    and path.suffix == ".pyc"):
                source = python_cache_source(tree, path)
                if source is None:
                    raise ValueError("ignored files outside bound scratch retained")
                caches.append({"path": str(path.relative_to(root)), "source": str(source.relative_to(root)),
                               "bytes": path.stat().st_size})
                continue
            if (not path.is_symlink() and path.is_file() and not path.is_relative_to(scratch)
                    and path != scratch.with_name(scratch.name + ".jsonl")):
                raise ValueError("ignored files outside bound scratch retained")
        proof.update(worktree_head=head, worktree_branch=git(tree, "symbolic-ref", "HEAD").decode().strip(),
                     discarded_python_cache=caches)
    # Checkouts of report-only batches are redundant, but their still-pending research data remains untouched.
    proof["retire_checkout"] = retired
    proof["compact_scratch"] = proof["kind"] != "settled-report-only"
    return batch, tree, scratch, proof


def active_cwd(path):
    for process in Path("/proc").iterdir():
        if not process.name.isdigit():
            continue
        try:
            cwd = (process / "cwd").resolve()
            if cwd == path or path in cwd.parents:
                return True
        except OSError:
            continue
    return False


def require_host_process_view():
    # A Codex sandbox sees only its own PID namespace, so an empty process scan proves nothing.
    if Path("/proc/1/comm").read_text().strip() not in ("systemd", "init"):
        raise ValueError("host process visibility required for reclamation or restoration")


def files_under(root, scratch):
    files = []
    for parent, directories, names in os.walk(scratch, followlinks=False):
        if any((Path(parent) / name).is_symlink() for name in directories + names):
            raise ValueError("scratch symlink retained")
        for name in names:
            path = safe_path(root, Path(parent) / name)
            if secret_name(path) or not path.is_file():
                raise ValueError("credential-named or non-regular scratch path retained")
            files.append(path)
    return sorted(files)


def sha_file(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def archive(root, base, scratch, files, proof, previous=None):
    archive_path = base.with_suffix(".tar.gz")
    manifest_path = base.with_suffix(".manifest.json")
    if archive_path.exists() or (manifest_path.exists() and previous is None):
        raise ValueError("existing archive retained; use explicit recovery")
    base.parent.mkdir(parents=True, exist_ok=True)
    if shutil.disk_usage(base.parent).free < sum(p.stat().st_size for p in files) + 1024 * 1024:
        raise ValueError("insufficient archive staging capacity; no deletion")
    records = []
    tmp = archive_path.with_name(archive_path.name + ".tmp")
    with tarfile.open(tmp, "w:gz", compresslevel=1, dereference=False) as tar:
        for path in files:
            safe_path(root, path)
            if path.is_symlink() or not path.is_file():
                raise ValueError("nonregular archive input retained")
            before = path.stat()
            digest = sha_file(path)
            name = str(path.relative_to(root))
            # Store hardlinked source copies as independent regular members: each path has its own SHA proof.
            info = tar.gettarinfo(path, arcname=name)
            info.type = tarfile.REGTYPE
            info.linkname = ""
            info.size = before.st_size
            with os.fdopen(os.open(path, os.O_RDONLY | os.O_NOFOLLOW), "rb") as source:
                opened = os.fstat(source.fileno())
                if (opened.st_ino, opened.st_dev) != (before.st_ino, before.st_dev):
                    raise ValueError("archive input changed before reading")
                tar.addfile(info, source)
            after = path.stat()
            if (before.st_size, before.st_mtime_ns, before.st_ino) != (after.st_size, after.st_mtime_ns, after.st_ino):
                raise ValueError("scratch changed during archival; no deletion")
            records.append({"path": name, "bytes": before.st_size, "sha256": digest, "mode": before.st_mode & 0o777})
    with tmp.open("rb") as handle:
        os.fsync(handle.fileno())
    with tarfile.open(tmp, "r:gz") as tar:
        members = tar.getmembers()
        if [m.name for m in members] != [r["path"] for r in records] or not all(m.isfile() for m in members):
            raise ValueError("archive member mismatch")
        for member, record in zip(members, records):
            h = hashlib.sha256()
            with tar.extractfile(member) as handle:
                for block in iter(lambda: handle.read(1024 * 1024), b""):
                    h.update(block)
            if h.hexdigest() != record["sha256"] or sha_file(root / record["path"]) != record["sha256"]:
                raise ValueError("archive verification failed; no deletion")
    os.replace(tmp, archive_path)
    manifest = {"schema": "learner-retention-v1", "at": stamp(), "root": str(root), "scratch": str(scratch.relative_to(root)),
                "proof": proof, "archive": str(archive_path.relative_to(root)), "archive_sha256": sha_file(archive_path),
                "archive_bytes": archive_path.stat().st_size, "files": records, "state": "archived_not_reclaimed"}
    if previous is not None:
        manifest['previous_manifest'] = previous
    atomic(manifest_path, manifest)
    return manifest, manifest_path


def project_small(root, manifest, destination):
    for record in manifest["files"]:
        path = Path(record["path"])
        if path.suffix not in (".md", ".json", ".py", ".ts", ".sh") or record["bytes"] > SMALL:
            continue
        target = destination / path
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(root / path, target)


def remove_checkout(root, state_dir, batch_id, tree, scratch, keep_scratch):
    """Leave the original launcher stream at its path, without archiving or deleting it."""
    staging = state_dir / "retention/staging" / (batch_id + "-checkout")
    if staging.exists():
        raise ValueError("prior interrupted checkout staging retained")
    staging.mkdir(parents=True)
    event = scratch.with_name(scratch.name + ".jsonl")
    if event.is_symlink():
        raise ValueError("original event symlink retained")
    if keep_scratch:
        os.rename(scratch, staging / "scratch")
    if event.exists():
        os.rename(event, staging / "events.jsonl")
    try:
        git(root, "worktree", "remove", str(tree))
    finally:
        scratch.parent.mkdir(parents=True, exist_ok=True)
        if (staging / "scratch").exists():
            os.rename(staging / "scratch", scratch)
        if (staging / "events.jsonl").exists():
            os.rename(staging / "events.jsonl", event)
        if not list(staging.iterdir()):
            staging.rmdir()


def storage_admission(root, directory, state, bid):
    from retention_scratch import done_admission, consumers
    module = SimpleNamespace(**globals())
    try:
        tree = safe_path(root, state.get('batches', {}).get(bid, {}).get('worktree') or root)
        if tree != root and not (tree / '.git').exists():
            raise ValueError('checkout already reclaimed; scratch storage only')
        batch, tree, scratch, proof = admission(root, directory, state, bid)
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
        if state.get('batches', {}).get(bid, {}).get('state') != 'done':
            raise
        batch, tree, scratch, proof = done_admission(root, directory, state, bid, module)
        proof['checkout_retained_reason'] = str(error)
    if batch.get('state') == 'done':
        proof['compact_scratch'] = True
    protected = consumers(root, directory, bid, batch, tree, scratch, module)
    if any(not (root / p).is_relative_to(scratch) and root / p != scratch.with_suffix('.jsonl') for p in protected):
        proof['retire_checkout'] = False
        proof['checkout_retained_reason'] = 'runtime proof files outside scratch'
    proof['runtime_original_paths'] = protected
    previous = directory / 'retention/archives' / (bid + '.manifest.json')
    if previous.is_file():
        saved = load(previous)
        old = saved['proof']
        if saved.get('state') == 'checkout_reclaimed' or old.get('restore_checkout'):
            proof.update(restore_checkout=True, worktree_head=old['worktree_head'], worktree_branch=old['worktree_branch'])
    workspace = directory / 'retention/worktree-archives' / (tree.name + '.manifest.json')
    if tree != root and not (tree / '.git').exists() and workspace.is_file():
        saved = load(workspace)
        old = saved.get('proof', {})
        if (saved.get('root') == str(root) and saved.get('state') == 'reclaimed'
                and old.get('worktree') == str(tree) and bid in old.get('learner_owners', [])):
            proof.update(restore_checkout=True, worktree_head=old['worktree_head'], worktree_branch=old['worktree_branch'],
                         workspace_restore=dict(path=str(workspace.relative_to(root)), sha256=sha_file(workspace)))
    return batch, tree, scratch, proof


def reclaim(root, state_dir, batch_id, apply=False, state=None):
    previous = state_dir / "retention/archives" / (batch_id + ".manifest.json")
    if not BATCH.fullmatch(batch_id):
        raise ValueError("invalid batch identity")
    prior = None
    if previous.exists():
        receipt = load(previous)
        if receipt.get('root') != str(root):
            raise ValueError('foreign archive runtime retained')
        if receipt.get('state') == 'checkout_reclaimed':
            prior = receipt
        elif receipt.get('state') == 'restored':
            prior = receipt
        elif receipt.get("state") == "reclaimed":
            return {"batch": batch_id, "state": "already_reclaimed"}
        else:
            raise ValueError("interrupted archive retained; inspect or restore explicitly")
    state = state or load(state_dir / "learn.json")
    batch, tree, scratch, proof = storage_admission(root, state_dir, state, batch_id)
    target = tree if proof["retire_checkout"] else scratch
    if active_cwd(target) or (proof.get("legacy_binding") and active_cwd(tree)):
        raise ValueError("active process cwd retained")
    files = files_under(root, scratch)
    protected = set(proof['runtime_original_paths'])
    files = [p for p in files if str(p.relative_to(root)) not in protected]
    estimate = {"batch": batch_id, "worktree": str(tree.relative_to(root)), "scratch": str(scratch.relative_to(root)),
                "proof": proof, "scratch_bytes": sum(p.stat().st_size for p in files), "scratch_files": len(files)}
    if not apply or not (proof["retire_checkout"] or proof["compact_scratch"]):
        return dict(estimate, state="eligible" if proof["retire_checkout"] or proof["compact_scratch"] else "retained-report")
    related = [ident for ident, b in state["batches"].items() if Path(b.get("worktree") or root) == tree]
    leases = [state_dir / "learner" / (tree.name + ".lock"), root / 'ops/live-merge.lock']
    leases += [state_dir / (ident + ".checks.lock") for ident in related]
    with locks(leases):
        with locks([state_dir / "learn.lock"]):
            _, _, _, current_proof = storage_admission(root, state_dir, load(state_dir / "learn.json"), batch_id)
            if (current_proof != proof or active_cwd(target)
                    or (proof.get("legacy_binding") and active_cwd(tree))):
                raise ValueError("owner/proof changed; retained")
        base = state_dir / "retention" / "archives" / batch_id
        before_space = shutil.disk_usage(root).free
        if proof["kind"] == "settled-report-only" and not proof['compact_scratch']:
            # The checkout is reproducible from its branch; pending scratch stays at the exact original paths.
            remove_checkout(root, state_dir, batch_id, tree, scratch, True)
            manifest = dict(estimate, schema="learner-retention-v1", root=str(root), at=stamp(),
                            state="checkout_reclaimed", branch_retained=True, pending_scratch_preserved=True)
            atomic(base.with_suffix(".manifest.json"), manifest)
        else:
            if prior and prior.get('state') == 'restored':
                archive_path = safe_path(root, prior['archive'])
                if sha_file(archive_path) != prior['archive_sha256']:
                    raise ValueError('archive hash mismatch')
                if ({str(p.relative_to(root)) for p in files} != {row['path'] for row in prior['files']}
                        or any(sha_file(root / row['path']) != row['sha256'] for row in prior['files'])):
                    raise ValueError('restored process files changed; preserve revised evidence')
                manifest, manifest_path = prior, base.with_suffix('.manifest.json')
                manifest.setdefault('original_proof', manifest['proof'])
                manifest['proof'] = proof
                manifest['state'] = 'archived_not_reclaimed'
                atomic(manifest_path, manifest)
            else:
                manifest, manifest_path = archive(root, base, scratch, files, proof, prior)
            staging = state_dir / "retention" / "staging" / batch_id
            if staging.exists():
                raise ValueError("prior interrupted projection retained")
            staging.mkdir(parents=True)
            project_small(root, manifest, staging)
            with locks([state_dir / "learn.lock"]):
                _, _, _, current_proof = storage_admission(root, state_dir, load(state_dir / "learn.json"), batch_id)
                if (current_proof != proof or active_cwd(target)
                        or (proof.get("legacy_binding") and active_cwd(tree))):
                    raise ValueError("owner changed before deletion; archive retained")
                # Delete only verified archive members. Consumer originals never enter the archive.
                current_files = files_under(root, scratch)
                if set(current_files) != set(files) | {root / p for p in protected if (root / p).is_relative_to(scratch)}:
                    raise ValueError('scratch file set changed before deletion')
                for record in manifest['files']:
                    if sha_file(root / record['path']) != record['sha256']:
                        raise ValueError('scratch changed before deletion')
                for record in manifest['files']:
                    path = root / record['path']
                    if (staging / record['path']).is_file():
                        continue
                    path.unlink()
                if proof["retire_checkout"]:
                    remove_checkout(root, state_dir, batch_id, tree, scratch, True)
                if staging.exists():
                    for parent, _, names in os.walk(staging):
                        for name in names:
                            source = Path(parent) / name
                            destination = root / source.relative_to(staging)
                            destination.parent.mkdir(parents=True, exist_ok=True)
                            os.replace(source, destination)
                    shutil.rmtree(staging)
            manifest.update(state="reclaimed", completed_at=stamp(), branch_retained=True,
                            process_files_restorable=True, original_paths_for_compact_reports_preserved=True)
            atomic(manifest_path, manifest)
        manifest["available_bytes_delta"] = shutil.disk_usage(root).free - before_space
        atomic(base.with_suffix(".manifest.json"), manifest)
        return {k: manifest[k] for k in ["state", "available_bytes_delta"]} | {"batch": batch_id}


def sweep(root, state_dir, apply, limit):
    from retention_metrics import bytes_under, batch_scope, summarize
    state = load(state_dir / "learn.json")
    limit = max(limit, min(128, sum(b.get('state') == 'done' for b in state.get('batches', {}).values())))
    result = {"at": stamp(), "apply": apply, "results": [], "retained": {}, "retained_bytes": {}, "limit": limit}
    started = time.monotonic()
    measured = set()
    batches = sorted(state.get("batches", {}), reverse=True)
    batches.sort(key=lambda ident: state["batches"][ident].get("task", "postmortem") == "postmortem")
    batches.sort(key=lambda ident: not (state_dir / "retention/requests" / (ident + ".json")).is_file())
    for batch_id in batches:
        batch = state["batches"][batch_id]
        tree = safe_path(root, batch.get("worktree") or root)
        workspace_manifest = state_dir / "retention/worktree-archives" / (tree.name + ".manifest.json")
        if batch.get('state') != 'done' and workspace_manifest.is_file() and not (tree / ".git").exists():
            workspace = load(workspace_manifest)
            if (workspace.get("state") == "reclaimed" and workspace.get("root") == str(root)
                    and workspace.get("proof", {}).get("worktree") == str(tree)
                    and batch_id in workspace["proof"].get("learner_owners", [])):
                if apply:
                    request_outcome(root, state_dir, batch_id, {
                        "state": "checkout_reclaimed", "workspace_manifest": str(workspace_manifest.relative_to(root)),
                        "workspace_manifest_sha256": sha_file(workspace_manifest), "no_parent_request_closed": True})
                continue
        if (state_dir / "retention/archives" / (batch_id + ".manifest.json")).exists():
            manifest = load(state_dir / "retention/archives" / (batch_id + ".manifest.json"))
            if manifest['state'] == 'reclaimed':
                if apply:
                    request_outcome(root, state_dir, batch_id, {"state": manifest["state"]})
                continue
        try:
            if len(result['results']) >= limit or (result['results'] and time.monotonic() - started >= 50):
                raise ValueError('sweep budget; retry next natural tick')
            item = reclaim(root, state_dir, batch_id, apply, state)
        except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
            reason = str(error)
            result["retained"][reason] = result["retained"].get(reason, 0) + 1
            try:
                scope = batch_scope(root, state_dir, batch_id, batch, SimpleNamespace(**globals()))
                count = 0 if (reason, scope) in measured else bytes_under(scope)
                measured.add((reason, scope))
                result['retained_bytes'][reason] = result['retained_bytes'].get(reason, 0) + count
            except (OSError, ValueError, KeyError, TypeError):
                result.setdefault('unknown_byte_batches', []).append(batch_id)
            if apply:
                request_outcome(root, state_dir, batch_id, {"state": "deferred", "reason": reason})
            continue
        if item.get("state") == "retained-report":
            reason = "report-only scratch awaits experience ingestion"
            result["retained"][reason] = result["retained"].get(reason, 0) + 1
            result['retained_bytes'][reason] = result['retained_bytes'].get(reason, 0) + item.get('scratch_bytes', 0)
            if apply:
                request_outcome(root, state_dir, batch_id, {"state": "deferred", "reason": reason})
            continue
        result["results"].append(item)
        if apply:
            request_outcome(root, state_dir, batch_id, item)
    atomic(state_dir / "retention/last-sweep.json", result)
    remaining = min(4, limit - len(result["results"]))
    if remaining > 0:
        import worktree_retention
        result["workspaces"] = worktree_retention.sweep(root, state_dir, apply, remaining)
        atomic(state_dir / "retention/last-sweep.json", result)
    storage_remaining = min(4, limit - len(result["results"]) - len(result.get("workspaces", {}).get("results", [])))
    if storage_remaining > 0 and (root / "ops/worktree_storage.py").is_file():
        # Cache eviction has no ingestion/completion semantics; reuse this same bounded worker.
        import worktree_storage
        result["storage_cache"] = worktree_storage.sweep(root, state_dir, apply, storage_remaining)
        atomic(state_dir / "retention/last-sweep.json", result)
    from refresh_retention import sweep as refresh_sweep
    result['refresh'] = refresh_sweep(root, state_dir, apply)
    for reason, count in result['refresh']['retained'].items():
        reason = 'refresh: ' + reason
        result['retained'][reason] = result['retained'].get(reason, 0) + count
        result['retained_bytes'][reason] = result['refresh']['retained_bytes'].get(reason.removeprefix('refresh: '), 0)
    summarize(root, state_dir, result, apply, SimpleNamespace(**globals()))
    atomic(state_dir / 'retention/last-sweep.json', result)
    return result


def request_outcome(root, state_dir, batch_id, outcome):
    if not BATCH.fullmatch(batch_id):
        return
    path = safe_path(root, state_dir / "retention/requests" / (batch_id + ".json"))
    if path.is_file():
        with locks([state_dir / "retention-request.lock"]):
            receipt = load(path)
            if receipt.get("batch") != batch_id:
                raise ValueError("cleanup request identity changed")
            receipt.update(state=outcome["state"], last_result=outcome, updated_at=stamp())
            atomic(path, receipt)


def request_cleanup(root, state_dir, batch_id):
    """Record a finished learner's intent; admission remains the only deletion authority."""
    if not BATCH.fullmatch(batch_id):
        raise ValueError("invalid batch identity")
    path = safe_path(root, state_dir / "retention/requests" / (batch_id + ".json"))
    with locks([state_dir / "learn.lock", state_dir / "retention-request.lock"]):
        batch = load(state_dir / "learn.json").get("batches", {}).get(batch_id)
        if not batch or batch.get("rc") != 0 or batch.get("state") not in ("done", "failed"):
            raise ValueError("learner has no recorded successful exit; no cleanup request")
        identity = {"batch": batch_id, "task": batch.get("task", "postmortem"),
                    "character": batch.get("character"), "worktree": batch.get("worktree") or str(root)}
        if path.exists():
            receipt = load(path)
            if any(receipt.get(k) != v for k, v in identity.items()):
                raise ValueError("cleanup request owner changed; original retained")
        else:
            receipt = dict(identity, schema="learner-cleanup-request-v1", requested_at=stamp(),
                           requested_by="learner-wrapper", state="pending_verification",
                           admission_required=True, model_finished_does_not_prove_ingestion=True)
            atomic(path, receipt)
    return {"batch": batch_id, "state": receipt["state"], "request": str(path.relative_to(root)),
            "worker": kick(root, state_dir, Path(__file__).parent)}


def restore(root, state_dir, batch_id, learn_locked=False):
    require_host_process_view()
    manifest = load(state_dir / "retention/archives" / (batch_id + ".manifest.json"))
    if manifest.get("root") != str(root) or manifest.get("state") not in ("reclaimed", "archived_not_reclaimed", "checkout_reclaimed", "restored"):
        raise ValueError("only this runtime's verified archives are restorable")
    path = safe_path(root, manifest["archive"]) if manifest.get("archive") else None
    if path is not None and sha_file(path) != manifest["archive_sha256"]:
        raise ValueError("archive hash mismatch")
    with locks([state_dir / "retention.lock", root / 'ops/live-merge.lock']
               + ([] if learn_locked else [state_dir / "learn.lock"])):
        state = load(state_dir / "learn.json")
        batch = state["batches"][batch_id]
        tree = safe_path(root, batch.get("worktree") or root)
        checkout = manifest['proof'].get('restore_checkout', manifest['proof']['retire_checkout'])
        target = tree if checkout else safe_path(root, manifest["scratch"])
        if active_cwd(target) or any(b.get("state") == "running" and Path(b.get("worktree") or root) == tree for b in state["batches"].values()):
            raise ValueError("active owner retained")
        from disk_capacity import require_capacity
        require_capacity(root, sum(row['bytes'] for row in manifest.get('files', []) if not (root / row['path']).exists()),
                         len(manifest.get('files', [])))
        if checkout and not (tree / '.git').exists() and manifest['proof'].get('workspace_restore'):
            ref = manifest['proof']['workspace_restore']
            saved_path = safe_path(root, ref['path'])
            if sha_file(saved_path) != ref['sha256']:
                raise ValueError('original workspace archive receipt changed')
            saved = load(saved_path)
            require_capacity(root, sum(row['bytes'] for row in saved['files'] if not (root / row['path']).exists()), len(saved['files']))
            import worktree_retention
            worktree_retention.restore(root, state_dir, tree.name)
            manifest['proof']['original_workspace_restore'] = manifest['proof'].pop('workspace_restore')
        if checkout and not (tree / ".git").exists():
            branch = manifest["proof"]["worktree_branch"]
            if git(root, "rev-parse", branch).decode().strip() != manifest["proof"]["worktree_head"]:
                raise ValueError("archived branch changed; existing evidence retained")
            staging = state_dir / "retention/staging" / ("restore-" + batch_id)
            if staging.exists():
                raise ValueError("prior restore staging retained")
            staging.parent.mkdir(parents=True, exist_ok=True)
            if tree.exists():
                os.rename(tree, staging)
            try:
                if (root / "ops/worktree_storage.py").is_file():
                    import worktree_checkout
                    worktree_checkout.restore_checkout(root, tree, branch.removeprefix("refs/heads/"))
                else:
                    git(root, "worktree", "add", str(tree), branch.removeprefix("refs/heads/"))
            except Exception:
                if not tree.exists() and staging.exists():
                    os.rename(staging, tree)
                raise
            if staging.exists():
                for parent, directories, names in os.walk(staging, followlinks=False):
                    if any((Path(parent) / n).is_symlink() for n in directories + names):
                        raise ValueError("changed projection symlink retained")
                    for name in names:
                        src = Path(parent) / name
                        dst = tree / src.relative_to(staging)
                        if dst.exists():
                            raise ValueError("checkout would overwrite retained projection")
                        dst.parent.mkdir(parents=True, exist_ok=True)
                        os.replace(src, dst)
                shutil.rmtree(staging)
        if path is None:
            return {"batch": batch_id, "state": "checkout_restored", "original_scratch_preserved": True}
        with tarfile.open(path, "r:gz") as tar:
            if [m.name for m in tar.getmembers()] != [r["path"] for r in manifest["files"]]:
                raise ValueError("archive members differ")
            for member, record in zip(tar.getmembers(), manifest["files"]):
                dest = safe_path(root, record["path"])
                if not member.isfile() or secret_name(dest):
                    raise ValueError("unsafe archive member")
                if dest.exists() and sha_file(dest) != record["sha256"]:
                    raise ValueError("existing changed artifact retained")
            for member, record in zip(tar.getmembers(), manifest["files"]):
                dest = safe_path(root, record["path"])
                if dest.exists():
                    continue
                dest.parent.mkdir(parents=True, exist_ok=True)
                with tar.extractfile(member) as source, dest.open("xb") as target:
                    shutil.copyfileobj(source, target)
                if sha_file(dest) != record["sha256"]:
                    raise ValueError("restored hash mismatch")
                dest.chmod(record["mode"])
        manifest.update(state='restored', restored_at=stamp())
        atomic(state_dir / 'retention/archives' / (batch_id + '.manifest.json'), manifest)
    return {"batch": batch_id, "state": "scratch_restored", "checkout_branch": manifest["proof"].get("worktree_branch")}


def kick(root, state_dir, scripts):
    """Reuse the existing tick, with one low-priority worker and no new timer/model call."""
    script = Path(scripts) / "learner_retention.py"
    if (os.environ.get("CODEX_OPS_RETENTION") == "off" or not script.is_file()
            or not (Path(root) / "ops/learner_retention.py").is_file()
            or any(name in os.environ for name in ("LEARNER_CMD", "CODEX_OPS_PENDING_CMD", "CODEX_OPS_LEARNER_CMD"))
            or not (Path(state_dir) / "learn.json").is_file()):
        return "disabled"
    directory = Path(state_dir)
    try:
        with locks([directory / "retention-launch.lock"]):
            pidfile = directory / "retention-worker.json"
            if pidfile.exists():
                pid = load(pidfile).get("pid")
                try:
                    args = Path(f"/proc/{int(pid)}/cmdline").read_bytes().split(b"\0")
                    if os.fsencode(script) in args:
                        return "running"
                except (OSError, TypeError, ValueError):
                    pass
            with (directory / "retention-worker.log").open("ab") as handle:
                proc = subprocess.Popen(["nice", "-n", "19", sys.executable, str(script), "sweep", "--root", str(root),
                                         "--state-dir", str(directory), "--apply", "--limit", "4"], cwd=root,
                                        stdin=subprocess.DEVNULL, stdout=handle, stderr=subprocess.STDOUT, start_new_session=True)
            atomic(pidfile, {"at": stamp(), "pid": proc.pid})
            return "started"
    except (OSError, ValueError, subprocess.SubprocessError):
        return "deferred"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["plan", "sweep", "restore", "request"])
    parser.add_argument("--root", default=os.environ.get("CODEX_OPS_ROOT") or Path(__file__).resolve().parents[1])
    parser.add_argument("--state-dir", default=os.environ.get("CODEX_OPS_DIR"))
    parser.add_argument("--batch")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--limit", type=int, default=4)
    args = parser.parse_args()
    if args.command == "plan" and args.apply:
        parser.error("plan never deletes; use sweep --apply")
    root = Path(args.root).resolve()
    directory = safe_path(root, args.state_dir or root / "ops/codex-ops")
    if args.batch and not BATCH.fullmatch(args.batch):
        parser.error("invalid batch")
    if not 1 <= args.limit <= 32 or not (root / ".git").exists():
        parser.error("invalid project or bounded limit")
    try:
        if args.apply or args.command == "restore":
            require_host_process_view()
        if args.command == "request":
            if not args.batch:
                parser.error("request requires exact batch")
            result = request_cleanup(root, directory, args.batch)
        elif args.command == "restore":
            if not args.batch:
                parser.error("restore requires exact batch")
            result = restore(root, directory, args.batch)
        else:
            with locks([directory / "retention.lock"]):
                result = reclaim(root, directory, args.batch, args.apply) if args.batch else sweep(root, directory, args.apply, args.limit)
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except (OSError, ValueError, KeyError, subprocess.SubprocessError) as error:
        print(json.dumps({"state": "retained", "reason": str(error)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
