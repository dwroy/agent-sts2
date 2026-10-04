"""Mechanical dispatch for write tasks. One learner owns each worktree; no review gate."""
import hashlib
import importlib.util
import json
import os
import re
import subprocess
import time

RUN_ID = re.compile(r"^[0-9A-Z]{12}$")
WORKTREES = {"experience-update": "exp", "fix-batch": "codex-dev"}


def external_writer(worktree):
    for pid in os.listdir("/proc"):
        if not pid.isdigit():
            continue
        try:
            argv = open(f"/proc/{pid}/cmdline", "rb").read().decode().split("\0")
        except (OSError, UnicodeError):
            continue
        if not any(arg.endswith("learner/run.ts") for arg in argv):
            continue
        if "--cwd" in argv and argv[argv.index("--cwd") + 1:][:1] == [worktree]:
            return True
    return False


def available(root, task):
    worktree = os.path.join(root, ".worktrees", WORKTREES[task])
    if not os.path.isfile(os.path.join(worktree, ".git")) or external_writer(worktree):
        return False
    result = subprocess.run(["git", "-C", worktree, "status", "--porcelain"], capture_output=True, text=True)
    return result.returncode == 0 and not result.stdout.strip()


def busy(state, task, alive):
    for batch in state["batches"].values():
        if batch.get("task", "postmortem") != task or batch.get("state") != "running":
            continue
        if alive(batch.get("pid")):
            return True
        batch.update(state="lost", retry_at=time.time() + 3600)
    return False


def retryable(state, task, key):
    previous = [batch for batch in state["batches"].values() if batch.get("task") == task and batch.get("key") == key]
    if any(batch.get("state") == "done" for batch in previous) or len(previous) >= 3:
        return False
    return not previous or max(batch.get("retry_at", 0) for batch in previous) <= time.time()


def pending(root, scripts, character):
    command = os.environ.get("CODEX_OPS_PENDING_CMD")
    argv = ["bash", "-c", command] if command else ["python3", os.path.join(scripts, "experience-pending.py"), "--character", character]
    try:
        result = subprocess.run(argv, cwd=root, capture_output=True, text=True, timeout=120)
        lines = result.stdout.splitlines()
        count = int(lines[0])
        runs = lines[1].split(",") if len(lines) > 1 else []
        return runs[:10] if result.returncode == 0 and count >= 1 and runs and all(RUN_ID.fullmatch(run) for run in runs) else []
    except (OSError, ValueError, subprocess.SubprocessError):
        return []


def fix_key(root, character):
    path = os.path.join(root, "notes", "fix-queue-v4.md")
    try:
        text = open(path, encoding="utf8").read()
    except OSError:
        text = ""
    accepted = []
    try:
        spec = importlib.util.spec_from_file_location("job_ledger", os.path.join(root, "learner", "ledger.py"))
        ledger = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(ledger)
        file = os.environ.get("LEDGER_FILE") or os.path.join(root, "paper", "materials", "learning", "ledger.jsonl")
        accepted = sorted(item["id"] for item in ledger.fold(ledger.read_rows(file)).values()
                          if item.get("character") == character and item.get("kind") == "bug-infra" and item.get("status") == "accepted")
    except (OSError, AttributeError, ImportError):
        pass
    # The task distinguishes pure bugs from strategy and already-fixed items; the dispatcher only detects work.
    open_lines = [line for line in text.splitlines() if re.match(r"^- \*\*", line) and "已修" not in line and "关闭" not in line]
    if not accepted and not open_lines:
        return None
    return hashlib.sha256(json.dumps([text, accepted], ensure_ascii=False).encode()).hexdigest()


def dispatch_write(state, root, scripts, task, character, runs, key, reason, alive, stamp):
    if busy(state, task, alive) or not available(root, task) or (reason != "ops" and not retryable(state, task, key)):
        return None
    batch_id = stamp + "-" + task
    worktree = os.path.join(root, ".worktrees", WORKTREES[task])
    proc = subprocess.Popen(["bash", os.path.join(scripts, "codex-ops-learner.sh"), batch_id, ",".join(runs), character, task, worktree],
                            cwd=root, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    state["batches"][batch_id] = {"task": task, "character": character, "runs": runs, "key": key,
                                 "pid": proc.pid, "state": "running", "reason": reason, "worktree": worktree}
    return batch_id, proc.pid


def check_jobs(state, root, scripts, character, alive, stamp):
    runs = pending(root, scripts, character)
    experience = dispatch_write(state, root, scripts, "experience-update", character, runs, ",".join(runs), "tick", alive, stamp) if runs else None
    key = fix_key(root, character)
    fixes = dispatch_write(state, root, scripts, "fix-batch", character, [], key, "tick", alive, stamp) if key else None
    return {"experience": experience, "fixes": fixes}
