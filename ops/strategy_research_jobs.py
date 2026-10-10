"""Priority and host registration for Roy's one frozen strategy study.

The scheduler holds its existing learn.lock. Completion uses the normal writer;
this module never creates game proposals or rewrites failed learner batches.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time

REQUEST = "roy-20261010-silent-deck-size-value"
REQUEST_PATH = "notes/strategy-research-silent.json"
KEY = "strategy-research:" + REQUEST


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def atomic_json(path, value):
    path = Path(path)
    temporary = path.with_name(path.name + "." + str(os.getpid()) + ".tmp")
    try:
        temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def runs(value):
    if (not isinstance(value, list) or not value or any(not isinstance(run, str) or
            not re.fullmatch(r"[A-Z0-9]{12}", run) for run in value) or len(value) != len(set(value))):
        raise ValueError("invalid research run set")
    return set(value)


def read_request(root, state):
    """Validate the unique request and its frozen, ended role inventory."""
    project = Path(root).resolve()
    path = project / REQUEST_PATH
    if not path.resolve().is_relative_to(project):
        raise ValueError("research request outside project")
    raw = path.read_bytes()
    request = json.loads(raw)
    if not isinstance(request, dict) or any(request.get(key) != value for key, value in {
            "request_id": REQUEST, "authorized_by": "Roy", "state": state,
            "task": "strategy-proposal", "character": "silent"}.items()):
        raise ValueError("research request identity mismatch")
    if state == "pending" and request.get("batch") is not None:
        raise ValueError("pending request already has a batch")

    def frozen(field, suffix):
        relative, expected = request.get(field), request.get(field + "_sha256")
        if (not isinstance(relative, str) or not relative or not isinstance(expected, str)
                or not re.fullmatch(r"[0-9a-f]{64}", expected)):
            raise ValueError("missing frozen artifact identity")
        artifact = (project / relative).resolve()
        if not artifact.is_relative_to(project) or artifact.suffix != suffix or not artifact.is_file():
            raise ValueError("frozen artifact outside project")
        content = artifact.read_bytes()
        if digest(content) != expected:
            raise ValueError("frozen artifact SHA mismatch")
        return content

    frozen("work_spec", ".md")
    manifest = json.loads(frozen("input_manifest", ".json"))
    if not isinstance(manifest, dict) or manifest.get("request_id") != REQUEST or manifest.get("character") != "silent":
        raise ValueError("frozen manifest identity mismatch")
    inventory = manifest.get("runs")
    if not isinstance(inventory, list) or any(not isinstance(row, dict) or
            row.get("character", "silent") != "silent" or not (row.get("ended") or row.get("ended_at")) for row in inventory):
        raise ValueError("research inventory must contain ended Silent runs")
    inventory_ids = runs([row.get("run_id") for row in inventory])
    anchors = runs(request.get("dispatch_runs"))
    if (len(anchors) > 10 or not anchors <= inventory_ids or runs(manifest.get("dispatch_runs")) != anchors
            or manifest.get("run_count") != len(inventory_ids)
            or request.get("evidence_run_count") != len(inventory_ids)):
        raise ValueError("research scope or anchors mismatch")
    sections = request.get("required_sections")
    if (not isinstance(sections, list) or not sections or any(not isinstance(key, str) or
            not re.fullmatch(r"[a-z][a-z0-9_]*", key) for key in sections) or len(set(sections)) != len(sections)):
        raise ValueError("invalid required research sections")
    for artifact in manifest.get("frozen_artifacts", []):
        if not isinstance(artifact, dict):
            raise ValueError("invalid frozen supporting artifact")
        for field, sha_field in (("path", "sha256"), ("index", "index_sha256")):
            if field not in artifact and field == "index":
                continue
            relative, expected = artifact.get(field), artifact.get(sha_field)
            if not isinstance(relative, str) or not isinstance(expected, str) or not re.fullmatch(r"[0-9a-f]{64}", expected):
                raise ValueError("missing supporting artifact identity")
            support = (project / relative).resolve()
            if not support.is_relative_to(project) or digest(support.read_bytes()) != expected:
                raise ValueError("frozen supporting artifact SHA mismatch")
    return request, raw


def manual_matches(state, root, character, evidence):
    """The same authorized anchors never fall back to an ordinary ops batch."""
    if character != "silent":
        return False
    try:
        requested = runs(evidence)
        for batch in state["batches"].values():
            if batch.get("research_request") == REQUEST and runs(batch.get("runs")) == requested:
                return True
        request = json.loads(Path(root, REQUEST_PATH).read_bytes())
        return (isinstance(request, dict) and request.get("request_id") == REQUEST
                and request.get("authorized_by") == "Roy" and request.get("character") == "silent"
                and request.get("task") == "strategy-proposal" and runs(request.get("dispatch_runs")) == requested)
    except (OSError, ValueError, TypeError):
        return False


def bound_batch(root, state_dir, batch_id, character, worktree, ident):
    if ident != REQUEST or character != "silent" or not re.fullmatch(r"[0-9]{8}-[0-9]{6}-strategy-proposal", batch_id):
        raise ValueError("research registration identity mismatch")
    tree = str(Path(root).resolve() / ".worktrees" / ("codex-strategy-silent-" + batch_id.removesuffix("-strategy-proposal")))
    if worktree != tree:
        raise ValueError("research registration worktree mismatch")
    state = json.loads(Path(state_dir, "learn.json").read_bytes())
    batch = state.get("batches", {}).get(batch_id)
    if not isinstance(batch, dict) or any(batch.get(key) != value for key, value in {
            "task": "strategy-proposal", "character": "silent", "research_request": REQUEST,
            "key": KEY, "reason": "ops", "worktree": tree}.items()):
        raise ValueError("research registration not saved")
    if "proposal_ids" in batch or "proposal_repair" in batch:
        raise ValueError("research registration mixed with proposal queue")
    return batch


def registered(root, state_dir, batch_id, character, worktree, ident):
    """A failed wrapper may finish only its actual, saved registration."""
    try:
        bound_batch(root, state_dir, batch_id, character, worktree, ident)
        return True
    except (OSError, ValueError, TypeError, AttributeError):
        return False


def ready(root, state_dir, batch_id, character, worktree, ident):
    """Called after the host wrapper acquires the scheduler's existing lock."""
    try:
        batch = bound_batch(root, state_dir, batch_id, character, worktree, ident)
        request, _ = read_request(root, "running")
        base = request.get("dispatch_base")
        actual = subprocess.run(["git", "-C", root, "cat-file", "-t", str(base)], capture_output=True, text=True)
        return (isinstance(base, str) and re.fullmatch(r"[0-9a-f]{40}", base) is not None
                and actual.returncode == 0 and actual.stdout.strip() == "commit"
                and batch.get("state") == "running" and request.get("batch") == batch_id
                and request.get("worktree") == worktree and request.get("pane") == batch.get("pane")
                and base == batch.get("research_dispatch_base")
                and request.get("input_manifest_sha256") == batch.get("research_input_sha256")
                and runs(batch.get("runs")) == runs(request.get("dispatch_runs")))
    except (OSError, ValueError, TypeError, AttributeError):
        return False


def dispatch(state, root, scripts, character, alive, stamp, dispatch_write, limit=2):
    """Use the next shared slot before automatically selected proposals."""
    if character != "silent" or not re.fullmatch(r"[0-9]{8}-[0-9]{6}", stamp):
        return None
    if any(batch.get("research_request") == REQUEST or batch.get("key") == KEY
           for batch in state["batches"].values()):
        return None  # Registered failures require explicit ops recovery.
    active = sum(1 for batch in state["batches"].values() if batch.get("task") == "strategy-proposal"
                 and batch.get("state") == "running" and alive(batch.get("pid")))
    if active >= limit:
        return None  # Full slots are read-only, including null attempts and history.
    try:
        request, before = read_request(root, "pending")
        if request.get("retry_at", 0) > time.time():
            return None
        result = subprocess.run(["git", "-C", root, "rev-parse", "main"], capture_output=True, text=True)
        base = result.stdout.strip()
        if result.returncode or not re.fullmatch(r"[0-9a-f]{40}", base):
            return None
    except (OSError, ValueError, TypeError):
        return None
    path = Path(root, REQUEST_PATH)
    state_dir = Path(os.environ.get("CODEX_OPS_DIR") or Path(root, "ops/codex-ops"))
    history = state_dir / "strategy-research-history"
    try:
        history.mkdir(parents=True, exist_ok=True)
        snapshot = history / (digest(before) + ".request.json")
        if not snapshot.exists():
            snapshot.write_bytes(before)
        prepared = {**request, "dispatch_base": base}
        if path.read_bytes() != before:
            return None
        atomic_json(path, prepared)
        prepared_raw = path.read_bytes()
    except OSError:
        return None  # No worker has started; the original request remains recoverable.
    attempt = {"request_id": REQUEST, "at": time.time(), "dispatch_base": base,
               "before_sha256": digest(before), "prepared_sha256": digest(prepared_raw), "batch": None,
               "status": "dispatch_not_started"}
    launched = None
    try:
        launched = dispatch_write(state, root, scripts, "strategy-proposal", "silent", request["dispatch_runs"],
                                  KEY, "ops", alive, stamp, research_request=REQUEST)
        if launched is None:
            attempt["status"] = "no_batch_returned"
            return None
        batch_id, pid = launched
        batch = state["batches"].get(batch_id)
        attempt.update(batch=batch_id, pid=pid, status="registered_binding_failed")
        if not isinstance(batch, dict) or batch.get("research_request") != REQUEST:
            raise ValueError("actual research batch registration missing")
        batch.update(research_dispatch_base=base, research_input_sha256=request["input_manifest_sha256"])
        current, current_raw = read_request(root, "pending")
        if current_raw != prepared_raw:
            raise ValueError("research request changed during dispatch")
        expected_tree = str(Path(root).resolve() / ".worktrees" / ("codex-strategy-silent-" + stamp))
        if (batch_id != stamp + "-strategy-proposal" or batch.get("worktree") != expected_tree
                or batch.get("state") != "running" or batch.get("character") != "silent"
                or batch.get("reason") != "ops" or runs(batch.get("runs")) != runs(request["dispatch_runs"])):
            raise ValueError("actual research batch identity mismatch")
        updated = {**current, "state": "running", "batch": batch_id, "worktree": expected_tree,
                   "pane": batch.get("pane"), "dispatch_status": "dispatched", "dispatched_at": time.time(),
                   "research_dispatch_receipt": str(history / (stamp + ".receipt.json"))}
        atomic_json(path, updated)
        attempt.update(status="running_bound", after_sha256=digest(path.read_bytes()), worktree=expected_tree,
                       pane=batch.get("pane"))
    except (OSError, ValueError, TypeError) as error:
        attempt["error"] = str(error)
        if launched and launched[0] in state["batches"]:
            state["batches"][launched[0]]["research_binding_error"] = str(error)
    finally:
        # The actual saved marker prevents duplicate studies after binding failure.
        if launched and launched[0] in state["batches"]:
            state["batches"][launched[0]]["research_dispatch_receipt"] = dict(attempt)
        try:
            atomic_json(history / (stamp + ".receipt.json"), attempt)
        except OSError as error:
            if launched and launched[0] in state["batches"]:
                state["batches"][launched[0]]["research_receipt_error"] = str(error)
            sys.stderr.write("research dispatch receipt could not be saved; actual batch remains registered\n")
    return launched


if __name__ == "__main__":
    if len(sys.argv) != 8 or sys.argv[1] not in ("ready", "registered"):
        raise SystemExit(2)
    check = ready if sys.argv[1] == "ready" else registered
    valid = check(*sys.argv[2:])
    if sys.argv[1] == "ready":
        root, state_dir, batch_id, character, tree, ident = sys.argv[2:]
        request = {}
        try:
            request = json.loads(Path(root, REQUEST_PATH).read_bytes())
        except (OSError, ValueError):
            pass
        if not isinstance(request, dict):
            request = {}
        receipt = {"request_id": ident, "batch": batch_id, "character": character, "worktree": tree,
                   "at": time.time(), "status": "registered_bound" if valid else "registration_rejected",
                   "dispatch_base": request.get("dispatch_base"), "input_sha256": request.get("input_manifest_sha256")}
        try:
            atomic_json(Path(state_dir, "learner", batch_id + ".research-registration.json"), receipt)
        except OSError:
            valid = False
            sys.stderr.write("research registration receipt could not be saved; no model started\n")
        if valid:
            print(request["dispatch_base"])
    if not valid:
        sys.stderr.write("research registration is not saved and bound to the approved frozen request\n")
    raise SystemExit(0 if valid else 1)
