"""Fail-closed ordinary completion, run by the existing finish/tick process after learn.lock is released."""
import fcntl
import hashlib
import importlib.util
import json
import os
import sys
from pathlib import Path
import re
import subprocess
import tempfile
import record_manifest

from ops_current import atomic, git, save, stamp

RECORDS = ("notes/lessons.md", "paper/materials/learning/ledger.jsonl", "paper/materials/learning/code-proposals.jsonl")
SPECIAL = ("external_source", "backfill_source", "feature_request", "research_request", "implementation_request", "boss_sim", "proposal_repair", "continuation_parent_batch")


def fingerprint(root):
    """Dispatch-bound executable source cut; unrelated records are deliberately excluded."""
    from learner_checks import SOURCE_PATHS
    raw = subprocess.check_output(["git", "-C", str(root), "diff", "HEAD", "--", *SOURCE_PATHS])
    untracked = subprocess.check_output(["git", "-C", str(root), "ls-files", "--others", "--exclude-standard", "--", *SOURCE_PATHS])
    if raw or untracked:
        raise ValueError("uncommitted executable source")
    return git(root, "rev-parse", "HEAD")


def notices(directory):
    return sorted(p.name for p in (Path(directory) / "learning-notices").glob("*.json"))


def baseline(root, directory):
    if not (Path(root) / ".git").exists():
        return None
    try:
        path = Path(root) / RECORDS[1]
        raw = path.read_bytes() if path.exists() else b""
        return {"head": fingerprint(root), "notices": notices(directory),
                "ledger": {"bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}}
    except (OSError, ValueError, subprocess.SubprocessError):
        return None


def eligible(root, directory, batch, report):
    """Do not interpret scientific prose, override null checks, or close a research parent."""
    task = batch.get("task", "postmortem")
    if batch.get("state") != "done" or batch.get("rc") != 0 or task not in ("postmortem", "strategy-proposal", "fix-batch"):
        raise ValueError("not a successful ordinary batch")
    if any(batch.get(key) for key in SPECIAL) or batch.get("learner_task", task) != task:
        raise ValueError("specialist/request/repair completion needs ops")
    if batch.get("proposal_audit_errors") or batch.get("proposal_repair_needed") or batch.get("merged") or batch.get("checks_pending"):
        raise ValueError("source publication or proposal audit needs ops")
    if any(report.get(key) for key in ("bugs", "questions", "disagreements", "needs_decision", "blocked", "fixes", "merged", "commit", "source_commit", "published_commit")):
        raise ValueError("bug, source, disagreement, or decision requires ops")
    original = batch.get("ordinary_baseline")
    if not isinstance(original, dict) or notices(directory) != original.get("notices"):
        raise ValueError("missing baseline or new learning notice")
    ledger_raw = (Path(root) / RECORDS[1]).read_bytes()
    cut = original.get("ledger", {})
    prefix = ledger_raw[:cut.get("bytes", 0)]
    if not cut or hashlib.sha256(prefix).hexdigest() != cut.get("sha256"):
        raise ValueError("ledger baseline missing or original bytes changed")
    for line in ledger_raw[cut["bytes"]:].splitlines():
        row = json.loads(line)
        if any(e.get("role") == "contradict" for e in row.get("evidence", [])):
            raise ValueError("new contradictory ledger evidence requires delivery")
    current = fingerprint(root)
    from learner_checks import SOURCE_PATHS
    if subprocess.run(["git", "-C", str(root), "diff", "--quiet", original["head"], current, "--", *SOURCE_PATHS]).returncode:
        raise ValueError("source changed during batch; retain ordinary ops review")
    if task == "postmortem":
        runs = batch.get("runs")
        if (not runs or set(report.get("appended", [])) != set(runs) or report.get("skipped")
                or type(report.get("ledger", {}).get("check")) is not int or report["ledger"]["check"] != 0 or batch.get("missing")):
            raise ValueError("incomplete postmortem or missing ledger evidence")
    elif not (batch.get("no_changes") or batch.get("no_change_proposals")):
        raise ValueError("missing original no-change Git proof")
    if task != "postmortem":
        tree = Path(batch["worktree"]).resolve()
        if (tree.parent != Path(root).resolve() / ".worktrees" or tree.name == "live"
                or not (tree / ".git").is_file() or (tree / ".git").is_symlink()
                or git(tree, "rev-parse", "--show-toplevel") != str(tree)
                or git(tree, "status", "--porcelain", "--untracked-files=all")
                or git(tree, "rev-parse", "HEAD") != report.get("base")):
            raise ValueError("source worktree is not strictly clean at its original base")
    raw_path = report.get("report")
    path = Path(raw_path).resolve() if isinstance(raw_path, str) else None
    allowed = (Path(root) if task == "postmortem" else tree) / "learner/runs"
    if not path or not allowed.resolve().is_relative_to(Path(root).resolve()) or not path.is_relative_to(allowed.resolve()) or path.suffix != ".md" or not path.is_file():
        raise ValueError("missing original report")
    questions = path.parent / "questions.json"
    if questions.exists() and json.loads(questions.read_text()) not in ([], {}):
        raise ValueError("original questions require delivery")
    return {"head": current, "report": str(path), "report_sha256": hashlib.sha256(path.read_bytes()).hexdigest()}


def offer(root, directory, batch_id, batch, report, event_kind, event_text):
    """Only suppress the old event once a durable candidate and all cheap guards exist."""
    try:
        proof = eligible(root, directory, batch, report)
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError):
        return False
    path = Path(directory) / "ordinary-close" / (batch_id + ".json")
    if not re.fullmatch(r"[A-Za-z0-9-]+", batch_id):
        return False
    if path.exists():
        try:
            saved = json.loads(path.read_text())
            return isinstance(saved, dict) and isinstance(saved.get("proof"), dict) and saved["proof"].get("report_sha256") == proof["report_sha256"]
        except (OSError, ValueError, TypeError):
            return False
    save(path, {"schema": "ordinary-close-v1", "batch": batch_id, "state": "pending", "at": stamp(),
                "task": batch.get("task", "postmortem"), "runs": batch.get("runs", []), "proof": proof,
                "event_kind": event_kind, "event_text": event_text, "original_batch": batch,
                "report": report, "ops_event_enqueued": False, "model_calls": 0, "game_actions": 0})
    return True


def ledger_check(root, candidates):
    """Use the original validator and require real evidence for every postmortem run."""
    sys.path.insert(0, str(Path(root) / "knowledge/builders"))
    spec = importlib.util.spec_from_file_location("ordinary_ledger", Path(root) / "learner/ledger.py")
    ledger = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(ledger)
    problems = ledger.check_file()
    if problems:
        raise ValueError("ledger check failed: " + "; ".join(problems[:5]))
    items = ledger.fold(ledger.read_rows())
    for candidate in candidates:
        if candidate["task"] != "postmortem":
            continue
        for run in candidate["runs"]:
            if not any(run in {e.get("run") for e in item.get("evidence", [])} | set(item.get("where", {}).get("lessons", [])) for item in items.values()):
                raise ValueError("postmortem run lacks ledger evidence: " + run)
    return {"problems": 0, "items": len(items)}


def controlled_commit(root, directory, paths, message, verify=None, appends=None):
    """Snapshot only approved records; keep all other dirty files and refuse any pre-staged index."""
    if set(appends or {}) - set(paths):
        raise ValueError("record append outside approved paths")
    root, directory = Path(root), Path(directory)
    head = git(root, "rev-parse", "HEAD")
    index = Path(git(root, "rev-parse", "--path-format=absolute", "--git-path", "index"))
    lock = Path(str(index) + ".lock")
    fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    try:
        if subprocess.run(["git", "-C", str(root), "diff", "--cached", "--quiet", head]).returncode:
            raise ValueError("pre-staged records retained; ops must decide ownership")
        with tempfile.TemporaryDirectory(prefix="ordinary-records-", dir=directory) as temp:
            temp = Path(temp)
            snapshots, originals = {}, {}
            for name in paths:
                path = root / name
                if path.is_symlink() or not path.resolve().is_relative_to(root.resolve()):
                    raise ValueError("unsafe record path")
                raw = path.read_bytes() if path.exists() else None
                if raw is not None or name in (appends or {}):
                    originals[name] = raw
                    snapshots[name] = (raw or b"") + (appends or {}).get(name, b"")
            scan = record_manifest.scan_snapshots(root, directory, snapshots, head)
            private = temp / "index"
            env = {**os.environ, "GIT_INDEX_FILE": str(private)}
            def run(*args, input=None):
                return subprocess.check_output(["git", "-C", str(root), *args], env=env, input=input).decode().strip()
            run("read-tree", head)
            hashes = {}
            for name, raw in snapshots.items():
                oid = run("hash-object", "-w", "--stdin", input=raw)
                run("update-index", "--add", "--cacheinfo", "100644", oid, name)
                hashes[name] = hashlib.sha256(raw).hexdigest()
            tree = run("write-tree")
            if tree == git(root, "rev-parse", head + "^{tree}"):
                return {"commit": head, "new_commit": False, "files": hashes, "scan": scan}
            if verify:
                verify()
            # HEAD and all staged bytes are rechecked before publishing the exact cut.
            if git(root, "rev-parse", "HEAD") != head or any(
                    ((root / name).read_bytes() if (root / name).exists() else None) != raw
                    for name, raw in originals.items()):
                raise ValueError("parallel record change; retain evidence and wake ops")
            commit = run("commit-tree", tree, "-p", head, input=(message + "\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>\n").encode())
            run("update-ref", "HEAD", commit, head)
            for name in appends or {}:
                atomic(root / name, snapshots[name])
            # The empty index was locked throughout; install the matching index without touching worktree bytes.
            remaining = memoryview(private.read_bytes())
            while remaining:
                remaining = remaining[os.write(fd, remaining):]
            os.fsync(fd)
            os.close(fd)
            fd = None
            os.replace(lock, index)
            return {"commit": commit, "new_commit": True, "files": hashes, "scan": scan}
    finally:
        if fd is not None:
            os.close(fd)
        lock.unlink(missing_ok=True)


def close_pending(root, directory, enqueue):
    """One original finish/tick owns the single dataset job; no background timer or model."""
    root, directory = Path(root), Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    with (directory / "ordinary-close.lock").open("a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return

        def attention(path, row, error):
            row.update(state="attention", reason=str(error), finished=stamp())
            save(path, row)
            event = enqueue("ordinary-close-attention", f"普通批次 {row['batch']} 自动收尾停止：{error}。原件 {path}；保持原报告/失败/父要求，不重复 dataset 或合入。")
            row.update(ops_event_enqueued=True, event=event)
            save(path, row)

        def validate(row):
            proof = eligible(root, directory, row["original_batch"], row["report"])
            if proof["report"] != row["proof"]["report"] or proof["report_sha256"] != row["proof"]["report_sha256"]:
                raise ValueError("completion report changed before close")
            return ledger_check(root, [row])

        class CandidateFailure(ValueError):
            def __init__(self, path, row, error):
                super().__init__(str(error))
                self.path, self.row = path, row

        candidates = []
        for path in sorted((directory / "ordinary-close").glob("*.json")):
            if path.name.endswith(".invalid.json"):
                continue
            try:
                candidate = json.loads(path.read_text())
                if not isinstance(candidate, dict) or candidate.get("state") not in ("pending", "running", "closed", "attention"):
                    raise ValueError("invalid ordinary completion receipt")
                if (candidate.get("schema") != "ordinary-close-v1" or candidate.get("batch") != path.stem
                        or not isinstance(candidate.get("proof"), dict)
                        or any(not isinstance(candidate.get(key), dict) for key in ("original_batch", "report"))):
                    raise ValueError("missing original completion evidence")
            except (OSError, ValueError) as error:
                # Preserve the broken original; one side receipt prevents repeated exception wakes.
                side = path.with_suffix(".invalid.json")
                if not side.exists():
                    event = enqueue("ordinary-close-attention", f"普通收尾回执不可读：{path}；{error}。保留原件，交原 ops。")
                    save(side, {"state": "attention", "source": str(path), "at": stamp(), "event": event})
                continue
            if candidate["state"] == "closed":
                continue
            if candidate["state"] == "attention":
                # Only an untouched pre-dataset failure can re-enter the original guards.
                # Even a null side-effect marker or an existing log requires ops inspection.
                if (any(key in candidate for key in ("started", "dataset_attempts", "dataset", "records"))
                        or candidate.get("reason", "").startswith("interrupted close has ambiguous side effects")
                        or (path.parent / (candidate["batch"] + ".dataset.log")).exists()):
                    continue
            try:
                if candidate["state"] == "running":
                    raise ValueError("interrupted close has ambiguous side effects; ops must inspect original receipt")
                audit = validate(candidate)
            except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
                if candidate["state"] != "attention":
                    attention(path, candidate, error)
                continue
            if candidate["state"] == "attention":
                # Preserve the entire old failure, including its actual event and frozen proof.
                history = candidate.setdefault("attempt_history", [])
                history.append({key: value for key, value in candidate.items() if key != "attempt_history"})
                for key in ("reason", "finished", "event", "ops_event_enqueued"):
                    candidate.pop(key, None)
                candidate.update(state="pending", ops_event_enqueued=False)
                save(path, candidate)
            candidate["ledger"] = audit
            candidates.append((path, candidate))
        if not candidates:
            return
        try:
            for path, row in candidates:
                row.update(state="running", started=stamp(), dataset_attempts=1)
                save(path, row)
            log = directory / "ordinary-close" / (candidates[0][1]["batch"] + ".dataset.log")
            with log.open("w") as handle:
                result = subprocess.run(["nice", "-n", "19", "python3", str(root / "ops/paper_dataset.py"), "--no-raw"],
                                        cwd=root, stdout=handle, stderr=subprocess.STDOUT, timeout=3600)
            if result.returncode:
                raise ValueError(f"dataset exit {result.returncode}; original log {log}")
            ready = []
            for path, row in candidates:
                try:
                    validate(row)
                except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
                    attention(path, row, error)
                else:
                    ready.append((path, row))
            candidates = ready
            if not candidates:
                return
            # Only the generator's tracked, current outputs are eligible; history/raw/knowledge stay untouched.
            generated = git(root, "ls-files", "paper/data/*", "paper/materials/*/cost.md", "paper/materials/cost.md").splitlines()
            paths = [*RECORDS, *(name for name in generated if not name.startswith("paper/data/history/"))]
            record = "paper/materials/ordinary-completions.jsonl"
            def verify():
                for path, row in candidates:
                    try:
                        validate(row)
                    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
                        raise CandidateFailure(path, row, error) from error
            # Validation can race with source/report updates even at the final Git guard.
            # Prepare record appends privately so a rejected candidate leaves no clean receipt.
            while candidates:
                lines = b"".join((json.dumps({"at": stamp(), "batch": row["batch"], "task": row["task"], "result": "clean-no-source",
                                              "report": row["proof"], "receipt": str(path), "ledger": row["ledger"], "dataset": str(log)},
                                             ensure_ascii=False) + "\n").encode() for path, row in candidates)
                try:
                    commit = controlled_commit(root, directory, [*paths, record],
                                               "Record clean ordinary completions: " + ", ".join(row["batch"] for _, row in candidates),
                                               verify, appends={record: lines})
                    break
                except CandidateFailure as error:
                    attention(error.path, error.row, error)
                    candidates = [(path, row) for path, row in candidates if path != error.path]
            if not candidates:
                return
            for path, row in candidates:
                row.update(state="closed", finished=stamp(), dataset={"rc": 0, "log": str(log), "sha256": hashlib.sha256(log.read_bytes()).hexdigest()},
                           records=commit, ops_event_enqueued=False)
                save(path, row)
        except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
            for path, row in candidates:
                attention(path, row, error)
