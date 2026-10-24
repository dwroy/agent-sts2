"""Mechanical dispatch for write tasks. One learner owns each worktree; no review gate."""
import hashlib
import importlib.util
import json
import os
import re
import subprocess
import sys
import time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import external_learning_policy
import publication_gate

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

    Hosted Codex batches have a detached supervisor and a dedicated interactive pane.
    The supervisor PID remains the scheduler's lease; only verified completion closes the pane.
    Fixed LEARNER_CMD fixtures retain the generic command-host path.
    """
    external = (len(argv) == 9 and argv[0] == "bash" and os.path.basename(argv[1]) == "codex-ops-learner.sh"
                and argv[5] == "strategy-proposal" and argv[7] == "strategy-proposal"
                and str(argv[8]).startswith("external:"))
    if publication_gate.learners_held(root, state_dir) or (publication_gate.candidates_only(root, state_dir) and not external):
        raise RuntimeError("learner admission held; only registered external candidates may start")
    launch_env = dict(os.environ)
    for name in ("LEARNER_HERDR_PANE", "LEARNER_HERDR_LABEL", "LEARNER_TUI_RECEIPT", "LEARNER_BACKFILL_SOURCE", "LEARNER_EXTERNAL_SOURCE", "LEARNER_EXTERNAL_SERVICE_TIER"):
        launch_env.pop(name, None)
    if hosting(state_dir, "learners", "CODEX_OPS_LEARNER_HOST", "setsid") == "herdr":
        pidfile = os.path.join(state_dir, "learner", label + ".pid")
        os.makedirs(os.path.dirname(pidfile), exist_ok=True)
        envs = []
        for name in sorted(launch_env):
            if PASS_ENV.match(name) and not SECRET_NAME.search(name):
                envs += ["--env", f"{name}={launch_env[name]}"]
        try:
            if (not os.environ.get("LEARNER_CMD")
                    and hosting(state_dir, "learner_tui", "CODEX_OPS_LEARNER_TUI", "on") != "off"):
                result = subprocess.run(["bash", os.path.join(scripts, "herdr-host.sh"), "open-pane", label],
                                        cwd=root, stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=90)
                pane = result.stdout.strip()
                if result.returncode == 0 and re.fullmatch(r"[A-Za-z0-9]+:p[A-Za-z0-9]+", pane):
                    env = dict(launch_env, LEARNER_HERDR_PANE=pane, LEARNER_HERDR_LABEL=label,
                               LEARNER_TUI_RECEIPT=os.path.join(state_dir, "learner", label + ".tui.json"))
                    proc = subprocess.Popen(["nice", "-n", "19", *argv], cwd=root, env=env, stdin=subprocess.DEVNULL,
                                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
                    try:
                        with open(pidfile, "w", encoding="utf8") as handle:
                            handle.write(str(proc.pid) + "\n")
                    except OSError:
                        # The supervisor already exists: never fall back and start a second one.
                        sys.stderr.write("learner supervisor pidfile unavailable; original PID returned for registration\n")
                    return proc.pid, pane
                if result.returncode == 4:
                    raise RuntimeError("learner pane is already busy; preserve it without a second launch")
                # No command was submitted: falling back cannot duplicate a model session.
                sys.stderr.write(f"herdr-host open {label} failed (exit {result.returncode}); starting with setsid\n")
                proc = subprocess.Popen(argv, cwd=root, env=launch_env, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                                        stderr=subprocess.DEVNULL, start_new_session=True)
                return proc.pid, None
            result = subprocess.run(["bash", os.path.join(scripts, "herdr-host.sh"), "run", label, "--pidfile", pidfile, "--close-on-exit",
                                     *envs, "--", *argv], cwd=root, stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=90)
            parts = result.stdout.split()
            if result.returncode == 0 and len(parts) == 2 and parts[1].isdigit():
                return int(parts[1]), parts[0]
            sys.stderr.write(f"herdr-host run {label} failed (exit {result.returncode}): {result.stderr.strip()[-300:]}; starting with setsid\n")
        except (OSError, subprocess.SubprocessError) as error:
            sys.stderr.write(f"herdr-host run {label} failed ({error}); starting with setsid\n")
    proc = subprocess.Popen(argv, cwd=root, env=launch_env, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    if "boss-sim-batch" in argv:
        pidfile = os.path.join(state_dir, "learner", label + ".pid")
        os.makedirs(os.path.dirname(pidfile), exist_ok=True)
        with open(pidfile, "w", encoding="utf8") as handle:
            handle.write(str(proc.pid) + "\n")
    return proc.pid, None
WORKTREES = {"experience-update": "exp", "fix-batch": "codex-fix", "strategy-proposal": "codex-strategy"}
STRATEGY_WORKERS = 2  # Roy approved two independent proposal workers on 2026-10-09.
FEATURE_REQUEST = "notes/silent-boss-calibration-dispatch.json"
# Explicit, approved templates and paths only; Roy's latest cache request has manual priority.
FEATURE_REQUESTS = {
    "silent-historical-core-builds": "notes/silent-historical-core-builds-dispatch.json",
    "codex-brain-cache": "notes/codex-brain-cache-dispatch.json",
    "silent-a10-regression": "notes/silent-a10-regression-dispatch.json",
    "silent-double-boss": "notes/silent-double-boss-dispatch.json",
    "boss-sim-automation": "notes/boss-sim-automation-dispatch.json",
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
    if task in ("fix-batch", "strategy-proposal"):
        # Each batch gets a fresh tree; a preserved failed candidate cannot block another job.
        return os.path.exists(os.path.join(root, ".git"))
    worktree = os.path.join(root, ".worktrees", WORKTREES[task])
    return available_worktree(worktree)


def available_worktree(worktree):
    if not os.path.isfile(os.path.join(worktree, ".git")) or external_writer(worktree):
        return False
    result = subprocess.run(["git", "-C", worktree, "status", "--porcelain"], capture_output=True, text=True)
    return result.returncode == 0 and not result.stdout.strip()


def feature_worktree(state, root, learner_task, request_id, alive):
    """The original feature retry/tree gates, also used by deferred priority checks."""
    prior = [batch for batch in state["batches"].values() if batch.get("feature_request") == request_id]
    if (any(batch.get("state") in ("done", "awaiting_review") or (batch.get("state") == "running" and alive(batch.get("pid"))) for batch in prior)
            or len(prior) >= 3 or (prior and max(batch.get("retry_at", 0) for batch in prior) > time.time())):
        return None
    worktree = os.path.join(root, ".worktrees", learner_task)
    if (any(batch.get("worktree") == worktree and batch.get("state") == "running" and alive(batch.get("pid"))
            for batch in state["batches"].values()) or (os.path.exists(worktree) and not available_worktree(worktree))
            or (learner_task != "silent-historical-core-builds" and not os.path.exists(worktree))):
        return None
    return worktree


def requested_feature(state, root, scripts, character, reason, alive, stamp, request=None):
    """Dispatch Roy's explicit feature requests with isolated templates and worktrees."""
    if character != "silent" or reason not in ("ops", "calibration-refresh", "core-builds"):
        return False, None
    learner_task = None
    if request is None:
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
    elif (reason == "core-builds" and isinstance(request, dict)
          and request.get("task") == "silent-historical-core-builds"
          and request.get("request_id") == "roy-20261009-historical-core-builds"
          and request.get("state") == "pending" and request.get("authorized_by") == "Roy"
          and request.get("character") == "silent"):
        learner_task = "silent-historical-core-builds"
    elif (reason == "calibration-refresh" and isinstance(request, dict)
          and request.get("state") == "pending" and request.get("task") == "silent-boss-calibration"
          and request.get("character") == "silent" and request.get("authorized_by") == "Roy"
          and isinstance(request.get("request_id"), str)
          and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._:-]{0,99}", request["request_id"])):
        learner_task = "silent-boss-calibration"
    else:
        return False, None
    if request is None:
        return False, None
    key = "feature:" + request["request_id"]
    worktree = feature_worktree(state, root, learner_task, request["request_id"], alive)
    if worktree is None:
        return True, None
    batch_id = stamp + "-fix-batch"
    if batch_id in state["batches"]:
        return True, None
    state_dir = os.environ.get("CODEX_OPS_DIR") or os.path.join(root, "ops", "codex-ops")
    extra = []
    if learner_task == "silent-historical-core-builds":
        import core_build_jobs
        evidence = core_build_jobs.freeze(root, state_dir, batch_id, request["request_id"])
        extra = [evidence]
    pid, pane = start_learner(["bash", os.path.join(scripts, "codex-ops-learner.sh"), batch_id, "", character,
                              "fix-batch", worktree, learner_task, *extra], root, scripts, state_dir,
                             "learner-" + batch_id)
    batch = {"task": "fix-batch", "learner_task": learner_task, "character": character,
             "runs": [], "key": key, "pid": pid, "state": "running", "reason": reason, "worktree": worktree,
             "feature_request": request["request_id"], "proposal_policy": "Roy-2026-10-07-learning"}
    if pane:
        batch["pane"] = pane
    if extra:
        batch["core_evidence"] = extra[0]
        batch["core_evidence_sha256"] = core_build_jobs.digest(extra[0])
        core_build_jobs.update_request(root, state="running", batch=batch_id,
                                       dispatch_status="dispatched", worktree=worktree,
                                       input_manifest=extra[0], input_manifest_sha256=core_build_jobs.digest(extra[0]),
                                       input_freeze_status="frozen_complete_ended_silent_inventory")
    state["batches"][batch_id] = batch
    return True, (batch_id, pid)


def busy(state, task, alive):
    active = 0
    limit = STRATEGY_WORKERS if task == "strategy-proposal" else 1
    for batch in state["batches"].values():
        # The dedicated feature owns its own worktree, not the normal fix/proposal tree.
        if batch.get("learner_task") in FEATURE_REQUESTS or batch.get("boss_sim"):
            continue
        if batch.get("external_source"):
            continue
        if batch.get("task") != task or batch.get("state") != "running":
            continue
        if alive(batch.get("pid")):
            active += 1
            if active >= limit:
                return True
            continue
        batch.update(state="lost", retry_at=time.time() + 3600)
    return False


def retryable(state, task, key):
    previous = [batch for batch in state["batches"].values() if batch.get("task") == task and batch.get("key") == key]
    if any(batch.get("state") in ("done", "awaiting_review") for batch in previous) or len(previous) >= 3:
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


def dispatch_write(state, root, scripts, task, character, runs, key, reason, alive, stamp, research_request=None, implementation_request=None, backfill_source=None, external_source=None):
    directory = publication_gate.directory(root)
    if publication_gate.learners_held(root, directory) or (publication_gate.candidates_only(root, directory) and not external_source):
        return None
    if external_source is not None:
        from strategy_backfill_jobs import ID
        if (not isinstance(external_source, str) or not ID.fullmatch(external_source)
                or task != "strategy-proposal" or character != "silent" or reason != "external" or runs
                or not re.fullmatch(re.escape("strategy-external:" + external_source) + r":[0-9]+", str(key))
                or research_request or implementation_request or backfill_source):
            return None
    if external_source:
        import strategy_external_jobs as external_jobs
        directory = os.environ.get("CODEX_OPS_DIR") or os.path.join(root, "ops/codex-ops")
        selected = external_learning_policy.snapshot(root, directory)
        if not selected["workers"] or not external_learning_policy.external_disk_allowed(root):
            return None
        try:
            configured = external_jobs.queue(root)
            plan = next(p for p in configured["plans"] if p["plan_id"] == external_source)
            occupied = external_jobs.occupied_lanes(state, configured, root, alive)
            if (not configured["enabled"] or len(external_jobs.active_external(state, alive, directory)) >= selected["workers"]
                    or external_jobs.lane(plan, external_jobs.source(root, plan)[0]) in occupied):
                return None
        except (OSError, ValueError, KeyError, TypeError, StopIteration):
            return None
    if backfill_source is not None:
        from strategy_backfill_jobs import ID
        if (not isinstance(backfill_source, str) or not ID.fullmatch(backfill_source)
                or task != "strategy-proposal" or character != "silent" or reason != "backfill"
                or not re.fullmatch(re.escape("strategy-backfill:" + backfill_source) + r":[0-9]+", str(key)) or research_request or implementation_request):
            return None
    # A released supervisor slot does not authorize replay of its unresolved original demand.
    if any(batch.get("state") == "awaiting_review" and batch.get("task") == task
           and batch.get("character") == character
           and (batch.get("key") == key or (runs and sorted(batch.get("runs", [])) == sorted(runs)))
           for batch in state["batches"].values()):
        return None
    if implementation_request is not None:
        from strategy_implementation_jobs import REQUEST, CONTINUATION
        if (implementation_request not in (REQUEST, CONTINUATION) or research_request is not None or task != "strategy-proposal"
                or character != "silent" or reason != "ops" or key != "strategy-implementation:" + implementation_request):
            return None
    if research_request is not None:
        from strategy_research_jobs import REQUEST_PATHS, research_key
        if (research_request not in REQUEST_PATHS or task != "strategy-proposal" or character != "silent"
                or reason != "ops" or key != research_key(research_request)):
            return None
    if character == "silent" and not external_source and external_learning_policy.four_lane_mode(state, root, alive) and external_learning_policy.own_busy(state, alive, os.environ.get("CODEX_OPS_DIR") or os.path.join(root, "ops/codex-ops")):
        return None
    if task == "fix-batch":
        handled, result = requested_feature(state, root, scripts, character, reason, alive, stamp)
        if handled:
            return result
    if task == "strategy-proposal" and any(batch.get("task") == task and batch.get("key") == key
            and batch.get("state") == "running" and alive(batch.get("pid")) for batch in state["batches"].values()):
        return None
    if (not external_source and busy(state, task, alive)) or not available(root, task) or (reason != "ops" and not retryable(state, task, key)):
        return None
    if task == "strategy-proposal" and character == "silent" and external_learning_policy.four_lane_mode(state, root, alive):
        from strategy_external_jobs import next_stamp
        stamp = next_stamp(state, stamp)
    batch_id = stamp + "-" + task
    if batch_id in state["batches"]:
        return None
    name = WORKTREES[task] if task == "experience-update" else f"{WORKTREES[task]}-{character}-{stamp}"
    worktree = os.path.join(root, ".worktrees", name)
    if task != "experience-update" and os.path.exists(worktree) and not available_worktree(worktree):
        return None
    state_dir = os.environ.get("CODEX_OPS_DIR") or os.path.join(root, "ops", "codex-ops")
    argv = ["bash", os.path.join(scripts, "codex-ops-learner.sh"), batch_id, ",".join(runs), character, task, worktree]
    if external_source:
        argv += [task, "external:" + external_source]
    elif backfill_source:
        argv += [task, "backfill:" + backfill_source]
    elif research_request:
        argv += [task, research_request]
    elif implementation_request:
        argv += [task, implementation_request]
    from ordinary_close import baseline
    ordinary_baseline = baseline(root, state_dir)
    pid, pane = start_learner(argv, root, scripts, state_dir, "learner-" + batch_id)
    state["batches"][batch_id] = {"task": task, "character": character, "runs": runs, "key": key,
                                 "pid": pid, "state": "running", "reason": reason, "worktree": worktree,
                                 "proposal_policy": "Roy-2026-10-07-learning", "ordinary_baseline": ordinary_baseline}
    if pane:
        state["batches"][batch_id]["pane"] = pane
    if external_source:
        state["batches"][batch_id]["external_source"] = external_source
    elif backfill_source:
        state["batches"][batch_id]["backfill_source"] = backfill_source
    elif research_request:
        state["batches"][batch_id]["research_request"] = research_request
    elif implementation_request:
        state["batches"][batch_id]["implementation_request"] = implementation_request
    return batch_id, pid


def check_jobs(state, root, scripts, character, alive, stamp):
    from disk_admission import jobs_allowed
    import strategy_external_jobs as external_jobs
    directory = os.environ.get("CODEX_OPS_DIR") or os.path.join(root, "ops/codex-ops")
    if publication_gate.learners_held(root, directory):
        return {"dispatched": None, "admission_hold": True}
    external_jobs.reconcile(state, directory)
    external_ready = character == "silent" and external_jobs.ready(state, root)
    four_lane_mode = character == "silent" and (external_ready or bool(external_jobs.active_external(state, alive)))
    if four_lane_mode:
        selected = external_learning_policy.snapshot(root, directory)
        state["external_learning_policy"] = selected
        external_learning_policy.request_switch(state, directory, selected)
    if not jobs_allowed(root, directory):
        return {"disk_capacity_hold": True, "dispatched": None}
    external = external_jobs.dispatch_lanes(state, root, scripts, character, alive, stamp, dispatch_write) if external_ready else []
    if publication_gate.candidates_only(root, directory):
        return {"candidate_only": True, "strategy_external": external, "backfill_hold": True}
    if four_lane_mode and external_learning_policy.own_busy(state, alive, os.environ.get("CODEX_OPS_DIR") or os.path.join(root, "ops/codex-ops")):
        return {"experience": None, "fixes": None, "strategy": None, "calibration": None,
                "core_builds": None, "backfill_hold": True, "strategy_external": external,
                "code_proposal": None, "boss_sim": None, "strategy_research": None, "learning_requests": None}
    attempted = []
    ordinary_claimed = [False]
    def claim(result):
        if result:
            ordinary_claimed[0] = True
        return result
    def normal_allowed():
        return not four_lane_mode or not ordinary_claimed[0]
    def priority_writer(*args, **kwargs):
        # Keep the ordinary order, but spend at most one launch on its turn.
        if not normal_allowed():
            return None
        if args[7] == "ops" or retryable(args[0], args[3], args[6]):
            attempted.append(args[3])
        return claim(dispatch_write(*args, **kwargs))
    core = None
    core_ready = False
    request = None
    if character == "silent":
        import core_build_jobs
        request = core_build_jobs.pending_request(root)
        if request:
            prior = [b for b in state["batches"].values() if b.get("feature_request") == request["request_id"]]
            core_ready = len(prior) < 3 and not any(b.get("state") in ("done", "awaiting_review") for b in prior)
            _, core = requested_feature(state, root, scripts, character, "core-builds", alive, stamp, request=request)
            claim(core)
    runs = pending(root, scripts, character)
    experience = priority_writer(state, root, scripts, "experience-update", character, runs, ",".join(runs), "tick", alive, stamp) if runs else None
    # Research helpers count strategy batches themselves, including external owners.
    helper_limit = STRATEGY_WORKERS + sum(bool(b.get("external_source")) and b.get("state") == "running"
                                        and alive(b.get("pid")) for b in state["batches"].values())
    from learning_requests import reconcile as reconcile_learning
    learning = claim(reconcile_learning(state, root, scripts, character, alive, stamp, start_learner, helper_limit)) if normal_allowed() else None
    # This approved frozen study gets the next slot before automatic proposals.
    # Its host wrapper waits for the parent's save_state under the existing lock.
    from strategy_research_jobs import dispatch as dispatch_research
    research = claim(dispatch_research(state, root, scripts, character, alive, stamp, priority_writer, helper_limit)) if normal_allowed() else None
    # Normal turns retain the ordinary proposal/fix/strategy order.
    spec = importlib.util.spec_from_file_location("job_proposals", os.path.join(os.path.dirname(__file__),"proposal_dispatch.py"))
    proposals = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(proposals)
    proposal = proposals.dispatch(state, root, scripts, character, alive, stamp, priority_writer) if normal_allowed() else None
    key = fix_key(root, character)
    fixes = priority_writer(state, root, scripts, "fix-batch", character, [], key, "tick", alive, stamp) if key else None
    strategy = claim(strategy_job(state, root, scripts, character, alive, stamp, writer=priority_writer)) if normal_allowed() and not proposal and not research else None
    calibration = claim(calibration_job(state, root, scripts, character, alive, stamp)) if normal_allowed() else None
    from boss_sim_jobs import check
    boss_sim = claim(check(state, root, scripts, character, alive, stamp, start_learner)) if normal_allowed() else None
    result = {"experience": experience, "fixes": fixes, "strategy": strategy, "calibration": calibration,
              "core_builds": core, "backfill_hold": bool(attempted or core_ready or external_ready), "strategy_external": external,
              "code_proposal": proposal, "boss_sim": boss_sim, "strategy_research": research, "learning_requests": learning}
    return result


def calibration_job(state, root, scripts, character, alive, stamp):
    """Roy-authorized periodic calibration; read live data, never overwrite refreshing knowledge."""
    state.setdefault("calibration_ready", {}).pop(character, None)
    if character != "silent":
        return None
    try:
        with open(os.path.join(root, ".worktrees/live/knowledge/characters/silent/boss-trust.json"), encoding="utf8") as handle:
            previous = json.load(handle)
        if previous.get("character") != "silent" or not previous.get("refresh"):
            return None  # The initial batch must publish before any automatic rerun.
        spec = importlib.util.spec_from_file_location("boss_refresh_cadence", os.path.join(scripts, "../agent/tools/boss-sim/cadence.py"))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with open(os.path.join(root, "logs/runs.jsonl"), encoding="utf8") as handle:
            runs = [json.loads(line) for line in handle if line.strip()]
        with open(os.path.join(root, "logs/sl-attempts.jsonl"), encoding="utf8") as handle:
            attempts = [json.loads(line) for line in handle if line.strip()]
        trigger = module.cadence(runs, attempts, previous["refresh"])
    except (OSError, ValueError, KeyError):
        return None
    if not trigger["due"]:
        return None
    identity = hashlib.sha256(json.dumps({"keys": trigger["keys"], "asc": trigger["max_asc"]}, sort_keys=True).encode()).hexdigest()[:24]
    request = {"state": "pending", "task": "silent-boss-calibration", "character": "silent",
               "authorized_by": "Roy", "request_id": "silent-calibration-" + identity}
    if feature_worktree(state, root, request["task"], request["request_id"], alive) is not None:
        state["calibration_ready"][character] = request["request_id"]
    _, result = requested_feature(state, root, scripts, character, "calibration-refresh", alive, stamp, request=request)
    return result


def strategy_job(state, root, scripts, character, alive, stamp, writer=None):
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
    result = (writer or dispatch_write)(state, root, scripts, "strategy-proposal", character, runs[-10:], key, "tick", alive, stamp)
    if result:
        state["batches"][result[0]]["strategy_progress"] = {"ascension": level, "runs": len(runs)}
    return result
