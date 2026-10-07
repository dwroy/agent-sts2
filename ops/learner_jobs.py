"""Mechanical dispatch for write tasks. One learner owns each worktree; no review gate."""
import hashlib
import importlib.util
import json
import os
import re
import subprocess
import sys
import time

RUN_ID = re.compile(r"^[0-9A-Z]{12}$")
# Environment names passed into a herdr pane (its shell has the herdr server's environment, not ours); never key-like ones.
PASS_ENV = re.compile(r"^(CODEX_OPS_|LEARNER_|LEDGER_|STS2_|CODEX_HOME$)")
SECRET_NAME = re.compile(r"KEY|TOKEN|SECRET|PASSWORD|AUTH", re.I)


def hosting(state_dir, key, env_name, default):
    """How a kind of process is hosted: $env_name, else `<key>=<value>` in <state dir>/hosting, else the default."""
    value = os.environ.get(env_name, "").strip()
    if not value:
        try:
            for line in open(os.path.join(state_dir, "hosting"), encoding="utf8"):
                name, _, setting = line.strip().partition("=")
                if name.strip() == key:
                    value = setting.strip()
        except OSError:
            pass
    return value or default


def start_learner(argv, root, scripts, state_dir, label):
    """Start a learner batch in the background; returns (pid, pane id or None).

    hosting learners=herdr (docs/codex-ops.md「herdr 托管」): in its own herdr pane `label` via ops/herdr-host.sh run
    --close-on-exit (the pid is the pane-side wrapper, the batch script's parent); otherwise, or when herdr is not
    available, setsid as before.
    """
    if hosting(state_dir, "learners", "CODEX_OPS_LEARNER_HOST", "setsid") == "herdr":
        pidfile = os.path.join(state_dir, "learner", label + ".pid")
        os.makedirs(os.path.dirname(pidfile), exist_ok=True)
        envs = []
        for name in sorted(os.environ):
            if PASS_ENV.match(name) and not SECRET_NAME.search(name):
                envs += ["--env", f"{name}={os.environ[name]}"]
        try:
            result = subprocess.run(["bash", os.path.join(scripts, "herdr-host.sh"), "run", label, "--pidfile", pidfile, "--close-on-exit",
                                     *envs, "--", *argv], cwd=root, stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=90)
            parts = result.stdout.split()
            if result.returncode == 0 and len(parts) == 2 and parts[1].isdigit():
                return int(parts[1]), parts[0]
            sys.stderr.write(f"herdr-host run {label} failed (exit {result.returncode}): {result.stderr.strip()[-300:]}; starting with setsid\n")
        except (OSError, subprocess.SubprocessError) as error:
            sys.stderr.write(f"herdr-host run {label} failed ({error}); starting with setsid\n")
    proc = subprocess.Popen(argv, cwd=root, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    return proc.pid, None
WORKTREES = {"experience-update": "exp", "fix-batch": "codex-dev", "strategy-proposal": "codex-dev"}
FEATURE_REQUEST = "notes/silent-boss-calibration-dispatch.json"
# Explicit, approved templates and paths only; the higher-priority brain request goes first.
FEATURE_REQUESTS = {
    "codex-only-brain": "notes/codex-only-brain-dispatch.json",
    "silent-boss-calibration": FEATURE_REQUEST,
}


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
    return available_worktree(worktree)


def available_worktree(worktree):
    if not os.path.isfile(os.path.join(worktree, ".git")) or external_writer(worktree):
        return False
    result = subprocess.run(["git", "-C", worktree, "status", "--porcelain"], capture_output=True, text=True)
    return result.returncode == 0 and not result.stdout.strip()


def requested_feature(state, root, scripts, character, reason, alive, stamp):
    """Dispatch Roy's explicit feature requests with isolated templates and worktrees."""
    if character != "silent" or reason != "ops":
        return False, None
    request = None
    learner_task = None
    for candidate, path in FEATURE_REQUESTS.items():
        try:
            with open(os.path.join(root, path), encoding="utf8") as handle:
                value = json.load(handle)
        except (OSError, ValueError):
            continue
        if (isinstance(value, dict) and value.get("state") == "pending"
                and value.get("task") == candidate and value.get("character") == "silent"
                and value.get("authorized_by") == "Roy" and isinstance(value.get("request_id"), str)
                and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._:-]{0,99}", value["request_id"])):
            request, learner_task = value, candidate
            break
    if request is None:
        return False, None
    key = "feature:" + request["request_id"]
    prior = [batch for batch in state["batches"].values() if batch.get("feature_request") == request["request_id"]]
    if (any(batch.get("state") == "done" or (batch.get("state") == "running" and alive(batch.get("pid"))) for batch in prior)
            or len(prior) >= 3 or (prior and max(batch.get("retry_at", 0) for batch in prior) > time.time())):
        return True, None
    worktree = os.path.join(root, ".worktrees", learner_task)
    if (any(batch.get("worktree") == worktree and batch.get("state") == "running" and alive(batch.get("pid"))
            for batch in state["batches"].values()) or not available_worktree(worktree)):
        return True, None
    batch_id = stamp + "-fix-batch"
    if batch_id in state["batches"]:
        return True, None
    state_dir = os.environ.get("CODEX_OPS_DIR") or os.path.join(root, "ops", "codex-ops")
    pid, pane = start_learner(["bash", os.path.join(scripts, "codex-ops-learner.sh"), batch_id, "", character,
                              "fix-batch", worktree, learner_task], root, scripts, state_dir,
                             "learner-" + batch_id)
    batch = {"task": "fix-batch", "learner_task": learner_task, "character": character,
             "runs": [], "key": key, "pid": pid, "state": "running", "reason": reason, "worktree": worktree,
             "feature_request": request["request_id"]}
    if pane:
        batch["pane"] = pane
    state["batches"][batch_id] = batch
    return True, (batch_id, pid)


def busy(state, task, alive):
    for batch in state["batches"].values():
        # The dedicated feature owns its own worktree, not the normal fix/proposal tree.
        if batch.get("learner_task") in FEATURE_REQUESTS:
            continue
        if WORKTREES.get(batch.get("task")) != WORKTREES[task] or batch.get("state") != "running":
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
    if task == "fix-batch":
        handled, result = requested_feature(state, root, scripts, character, reason, alive, stamp)
        if handled:
            return result
    if busy(state, task, alive) or not available(root, task) or (reason != "ops" and not retryable(state, task, key)):
        return None
    batch_id = stamp + "-" + task
    worktree = os.path.join(root, ".worktrees", WORKTREES[task])
    state_dir = os.environ.get("CODEX_OPS_DIR") or os.path.join(root, "ops", "codex-ops")
    pid, pane = start_learner(["bash", os.path.join(scripts, "codex-ops-learner.sh"), batch_id, ",".join(runs), character, task, worktree],
                              root, scripts, state_dir, "learner-" + batch_id)
    state["batches"][batch_id] = {"task": task, "character": character, "runs": runs, "key": key,
                                 "pid": pid, "state": "running", "reason": reason, "worktree": worktree}
    if pane:
        state["batches"][batch_id]["pane"] = pane
    return batch_id, pid


def check_jobs(state, root, scripts, character, alive, stamp):
    runs = pending(root, scripts, character)
    experience = dispatch_write(state, root, scripts, "experience-update", character, runs, ",".join(runs), "tick", alive, stamp) if runs else None
    key = fix_key(root, character)
    fixes = dispatch_write(state, root, scripts, "fix-batch", character, [], key, "tick", alive, stamp) if key else None
    strategy = strategy_job(state, root, scripts, character, alive, stamp)
    return {"experience": experience, "fixes": fixes, "strategy": strategy}


def strategy_job(state, root, scripts, character, alive, stamp):
    """Dispatch after an ascension change or ten new completed postmortems, retaining a busy trigger."""
    runs = list(dict.fromkeys(run for batch in state["batches"].values()
                             if batch.get("task", "postmortem") == "postmortem"
                             and batch.get("character") == character and batch.get("state") == "done"
                             for run in batch.get("runs", []) if RUN_ID.fullmatch(run)))
    level = state.get("ascension", {}).get(character, 0)
    progress = state.setdefault("strategy", {}).setdefault(character, {"ascension": level, "runs": 0})
    # Only completed work consumes the trigger; retryable() governs failures and duplicate dispatch.
    completed = [batch for batch in state["batches"].values()
                 if batch.get("task") == "strategy-proposal" and batch.get("character") == character
                 and batch.get("state") == "done" and "strategy_progress" in batch]
    if completed:
        latest = completed[-1]["strategy_progress"]
        progress.update(ascension=max(progress["ascension"], latest["ascension"]), runs=max(progress["runs"], latest["runs"]))
    if not runs or (level <= progress["ascension"] and len(runs) < progress["runs"] + 10):
        return None
    key = f"{character}:A{level}:{len(runs)}"
    result = dispatch_write(state, root, scripts, "strategy-proposal", character, runs[-10:], key, "tick", alive, stamp)
    if result:
        state["batches"][result[0]]["strategy_progress"] = {"ascension": level, "runs": len(runs)}
    return result
