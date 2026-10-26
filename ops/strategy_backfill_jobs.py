"""Frozen experience sources at the tail of the existing strategy writer queue.

The caller owns learn.lock. Registration reserves an attempt; only native prompt
acceptance consumes IDs. Uncertain/failed attempts retain their original leases.
"""
import datetime as dt
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time

from strategy_research_jobs import atomic_json, digest

QUEUE = "notes/strategy-backfill-silent.json"
REQUEST = "github-issue-48-experience-strategy-rk-20261023"
ID = re.compile(r"[a-z0-9][a-z0-9._-]{0,119}")
BATCH = re.compile(r"[0-9]{8}-[0-9]{6}-strategy-proposal")


def artifact(root, ref):
    project = Path(root).resolve()
    relative, sha = ref.get("path"), ref.get("sha256")
    if not isinstance(relative, str) or Path(relative).is_absolute() or not re.fullmatch(r"[0-9a-f]{64}", str(sha)):
        raise ValueError("invalid backfill artifact identity")
    path = (project / relative).resolve()
    if not path.is_relative_to(project):
        raise ValueError("backfill artifact outside project")
    raw = path.read_bytes()
    if digest(raw) != sha or "bytes" in ref and len(raw) != ref["bytes"]:
        raise ValueError("backfill artifact fingerprint changed: " + relative)
    return raw


def queue(root):
    value = json.loads(Path(root, QUEUE).read_bytes())
    if (value.get("schema") != 1 or value.get("request_id") != REQUEST or value.get("character") != "silent"
            or value.get("authorized_by") != "Roy" or type(value.get("enabled")) is not bool
            or not isinstance(value.get("plans"), list)):
        raise ValueError("invalid backfill queue")
    ids = [plan.get("plan_id") for plan in value["plans"]]
    if any(not isinstance(ident, str) or not ID.fullmatch(ident) for ident in ids) or len(set(ids)) != len(ids):
        raise ValueError("invalid or duplicate backfill plan")
    return value


def source(root, plan):
    """Read immutable inputs without borrowing legacy request or batch identities."""
    raw = artifact(root, plan["input_manifest"])
    manifest = json.loads(raw)
    ident = plan["plan_id"]
    if manifest.get("request_id") != REQUEST or manifest.get("batch_plan_id") != ident:
        raise ValueError("backfill manifest identity mismatch")
    spec = artifact(root, plan["work_spec"])
    if manifest.get("work_spec") != plan["work_spec"]:
        raise ValueError("backfill work spec identity mismatch")
    original = json.loads(artifact(root, manifest["source_experience"]))["entries"]
    selected = json.loads(artifact(root, manifest["first_batch"]))
    inventory = json.loads(artifact(root, manifest["own_ended_inventory"]))
    artifact(root, manifest["priority"])
    copies = plan.get("artifact_copies", {})
    refs = manifest["external_aggregates"] + manifest["contracts"]
    if not isinstance(copies, dict) or not set(copies) <= {ref["path"] for ref in refs}:
        raise ValueError("backfill artifact copy is not a frozen manifest reference")
    for ref in refs:
        # The manifest retains its original path and SHA. Only an identical durable
        # copy can replace a temporary owner checkout; no input bytes are revised.
        artifact(root, {**ref, "path": copies.get(ref["path"], ref["path"])})
    if selected.get("batch_plan_id") != ident or inventory.get("character") != "silent":
        raise ValueError("backfill selection/inventory identity mismatch")
    entries = selected["entries"]
    ids = [row["id"] for row in entries]
    originals = {row["id"]: row for row in original}
    if (not 1 <= len(ids) <= 6 or len(set(ids)) != len(ids)
            or any(row != originals.get(row["id"]) for row in entries)
            or len(originals) != len(original)):
        raise ValueError("backfill IDs differ from immutable experience")
    runs = inventory["runs"]
    if not runs or any(not row.get("ended") or not re.fullmatch(r"[A-Z0-9]{12}", str(row.get("run_id"))) for row in runs):
        raise ValueError("backfill inventory requires ended Silent runs")
    available = set(selected["available_ended_silent_ids"])
    if not available <= {row["run_id"] for row in runs}:
        raise ValueError("backfill anchors outside ended inventory")
    # Anchors identify dispatch only; they never claim raw-window verification.
    anchors = sorted(available)[:10]
    if not anchors:
        raise ValueError("backfill has no ended dispatch anchors")
    binding = {"request_id": REQUEST, "plan_id": ident, "input_manifest": plan["input_manifest"],
               "work_spec": plan["work_spec"], "entry_ids": ids,
               "all_entry_ids": list(originals), "dispatch_runs": anchors, "artifact_copies": copies}
    return binding, spec


def progress(state):
    return state.setdefault("strategy_backfill", {"schema": 1, "cursor": 0, "entries": {}, "plans": {}})


def priority_hold(state, character, alive, normal, root=None):
    """Existing ready dispatch attempts and live heavy leases always win."""
    if normal.get("disk_capacity_hold") or normal.get("backfill_hold") or any(
            value for key, value in normal.items() if key not in ("backfill_hold", "own_learning")):
        return True
    if normal.get("own_learning", {}).get("busy"):
        return True
    if any(batch.get("state") in ("running", "launching", "awaiting_review")
           and (alive(batch.get("pid")) or batch.get("state") == "launching")
           for batch in state["batches"].values()):
        return True
    if any(
            req.get("state") in ("pending", "running") and req.get("character", character) == character
            for req in state.get("learning_requests", {}).values()):
        return True
    from learner_jobs import available_worktree, feature_worktree
    from ascension_audit import priority_pending
    root = root or os.environ.get("CODEX_OPS_ROOT") or str(Path(__file__).resolve().parent.parent)
    calibration = state.get("calibration_ready", {}).get(character)
    if (calibration and character == "silent"
            and feature_worktree(state, root, "silent-boss-calibration", calibration, alive) is not None):
        return True
    if priority_pending(state, root, character, available_worktree):
        return True
    # Existing heavy evidence waiting on a lease/retry must not be overtaken.
    observed = state.get("boss_sim_observed", {}).get(character, {}).get("eligible", [])
    for item in observed:
        prior = [b for b in state["batches"].values() if b.get("boss_sim", {}).get("key") == item.get("key")]
        scope = f"{character}:{item['boss']}:{item['mode']}"
        if not state.get("boss_sim_cooldown", {}).get(scope) and not any(
                b.get("state") in ("done", "rejected") for b in prior):
            return True
    return False


def source_kind(batch):
    """Keep source identities separate while sharing native lease verification."""
    return "external" if batch.get("external_source") else "backfill"


def source_value(batch, suffix):
    return batch[source_kind(batch) + "_" + suffix]


def stdio_registration(batch_id, batch, directory, complete=False):
    """Locate only this launcher's own session in its original selected account."""
    launch = json.loads(Path(directory, "learner", batch_id + "." + source_kind(batch) + "-launch.json").read_bytes())
    if any(launch.get(k) != v for k, v in {"batch": batch_id, "source": source_value(batch, "source"), "cwd": batch["worktree"]}.items()):
        raise ValueError("backfill stdio launch mismatch")
    log = Path(launch["log"]).resolve()
    if not log.is_relative_to(Path(batch["worktree"]).parent.parent / "learner/runs"):
        raise ValueError("backfill launch log outside learner records")
    first = attempt = session = summary = None
    with log.open() as stream:
        for line in stream:
            if not line.endswith("\n"):
                break
            row = json.loads(line)
            if first is None:
                first = row
                if (first.get("type") != "learner_launch" or first.get("transport") != "stdio"
                        or first.get("cwd") != batch["worktree"] or first.get("task") != "strategy-proposal"
                        or first.get("params", {}).get("batch") != batch_id):
                    raise ValueError("backfill launch journal mismatch")
            if row.get("type") == "learner_startup_attempt":
                if session or row.get("batch") != batch_id or any(row.get(k) != launch.get(k) for k in ("lease", "input_sha256", "command_sha256")):
                    raise ValueError("backfill stdio startup identity mismatch")
                attempt = row
            if row.get("type") == "thread.started":
                if not attempt or session:
                    raise ValueError("backfill stdio cannot adopt another session")
                session = row.get("thread_id")
                if not complete:
                    break
            if row.get("type") == "learner_summary":
                summary = row
    if not isinstance(session, str) or not re.fullmatch(r"[0-9a-f-]{36}", session):
        raise ValueError("backfill stdio native session not yet created")
    files = list(Path(launch["codex_home"], "sessions").glob("*/*/*/*-" + session + ".jsonl"))
    if len(files) != 1:
        raise ValueError("backfill stdio native rollout not uniquely located")
    return launch, session, files[0], summary


def retired(batch_id, batch, directory):
    """Recovery needs a verified original exit, including wrapper pre-model failures."""
    folder = Path(directory, "learner")
    no_model = folder / (batch_id + "." + source_kind(batch) + "-not-started.json")
    if no_model.exists():
        saved = json.loads(no_model.read_bytes())
        if (saved == {"batch": batch_id, "source": source_value(batch, "source"), "worktree": batch["worktree"], "models_started": 0}
                and not (folder / (batch_id + "." + source_kind(batch) + "-launch.json")).exists()
                and not (folder / ("learner-" + batch_id + ".tui.json")).exists()):
            return
        raise ValueError("backfill pre-model failure proof changed")
    tui = folder / ("learner-" + batch_id + ".tui.json")
    if tui.exists():
        from learner_tui import verified_code
        verified_code(tui, folder / (batch_id + ".out"), batch["rc"])
        return
    proof = native_start(batch_id, batch, directory)
    _, session, rollout, summary = stdio_registration(batch_id, batch, directory, complete=True)
    if (not summary or summary.get("exit_code") != batch["rc"] or summary.get("summary", {}).get("sessionId") != session):
        raise ValueError("backfill stdio original launcher has not finished")
    closed = False
    with rollout.open() as stream:
        for line in stream:
            if not line.endswith("\n"):
                raise ValueError("backfill stdio native exit incomplete")
            row = json.loads(line); payload = row.get("payload", {})
            if row.get("type") == "event_msg" and payload.get("type") == "task_started":
                if payload.get("turn_id") != proof["turn"]:
                    raise ValueError("backfill stdio has unbound later activity")
                closed = False
            if row.get("type") == "event_msg" and payload.get("type") in ("task_complete", "turn_aborted"):
                closed = payload.get("turn_id") == proof["turn"]
    if not closed:
        raise ValueError("backfill stdio native task is still open")


def native_start(batch_id, batch, directory):
    """Verify the first native prompt and high/workspace-write context while still running."""
    from learner_tui import bootstrap_context, prompt_hash
    path = Path(directory, "learner", "learner-" + batch_id + ".tui.json")
    stdio = not path.exists()
    if stdio:
        launch, session, rollout, _ = stdio_registration(batch_id, batch, directory)
        receipt = {"label": "learner-" + batch_id, "pane": batch.get("pane"), "cwd": batch["worktree"],
                   "submitted": True, "session": session, "rollout": str(rollout),
                   "bindings": [{"marker": None, "turn_id": None, "prompt_sha256": launch["prompt_sha256"]}],
                   "submissions": [{"marker": None, "prompt_sha256": launch["prompt_sha256"]}]}
    else:
        receipt = json.loads(path.read_bytes())
    if (receipt.get("label") != "learner-" + batch_id or receipt.get("pane") != batch.get("pane")
            or receipt.get("cwd") != batch["worktree"] or not receipt.get("submitted")):
        raise ValueError("backfill native receipt identity mismatch")
    first = receipt["bindings"][0]
    if receipt["submissions"][0] != {"marker": first["marker"], "prompt_sha256": first["prompt_sha256"]}:
        raise ValueError("backfill native submission mismatch")
    meta = current = started = None
    accepted = context = False
    observed_tier = None
    prefix = bytearray()
    with open(receipt["rollout"], "rb") as stream:
        for _ in range(128):
            line = stream.readline(2 * 1024 * 1024)
            if not line.endswith(b"\n"):
                break
            prefix.extend(line)
            if len(prefix) > 4 * 1024 * 1024:
                raise ValueError("backfill native prefix exceeds bound")
            row = json.loads(line); payload = row.get("payload", {})
            if row.get("type") == "session_meta":
                if meta or payload.get("id") != receipt.get("session") or payload.get("cwd") != batch["worktree"]:
                    raise ValueError("backfill native session mismatch")
                meta = payload["id"]
            if row.get("type") == "event_msg" and payload.get("type") == "task_started":
                if current or not stdio and payload.get("turn_id") != first["turn_id"]:
                    raise ValueError("backfill cannot adopt an old native turn")
                current = payload["turn_id"]
                started = row.get("timestamp")
            if row.get("type") == "turn_context":
                if (payload.get("turn_id") != current or payload.get("cwd") != batch["worktree"]
                        or payload.get("model") != "gpt-6.1-sol" or payload.get("effort") != "high"
                        or payload.get("sandbox_policy", {}).get("type") != "workspace-write"):
                    raise ValueError("backfill native execution context mismatch")
                observed_tier = payload.get("service_tier") if payload.get("service_tier") in ("ultrafast", "fast", "default") else None
                context = True
            user = None
            if row.get("type") == "event_msg" and payload.get("type") == "user_message":
                user = payload.get("message", "")
            if row.get("type") == "response_item" and payload.get("type") == "message" and payload.get("role") == "user":
                if bootstrap_context(row, batch["worktree"]) and not context and not accepted:
                    continue
                user = "\n".join(part.get("text", "") for part in payload.get("content", []))
            if user is not None:
                if (not meta or not current or not stdio and user.replace("\r\n", "\n").split("\n")[0] != first["marker"]
                        or prompt_hash(user) != first["prompt_sha256"]):
                    raise ValueError("backfill native prompt mismatch")
                if not accepted and any(token not in user for token in (
                        batch_id, source_value(batch, "source"), source_value(batch, "binding")["input_manifest"]["sha256"])):
                    raise ValueError("backfill native prompt lacks frozen source binding")
                accepted = True
            if meta and current and context and accepted:
                return {"session": meta, "turn": current, "started_at": started, "prompt_sha256": first["prompt_sha256"],
                        "service_tier": observed_tier, "rollout": receipt["rollout"], "prefix_bytes": len(prefix), "prefix_sha256": digest(prefix)}
    raise ValueError("backfill native start not yet verified")


def _reconcile(state, directory, kind="backfill"):
    """Recover progress from saved batches; never mutate a running startup lease."""
    own = [(bid, b) for bid, b in state["batches"].items() if b.get(kind + "_source")]
    if not own:
        return
    record = state.setdefault("strategy_" + kind, {"schema": 1, "cursor": 0, "entries": {}, "plans": {}})
    for bid, batch in own:
        binding = source_value(batch, "binding"); ident = binding["plan_id"]
        plan = record["plans"].setdefault(ident, {"attempts": [], "state": "registered"})
        attempt = next((row for row in plan["attempts"] if row["batch"] == bid), None)
        if attempt is None:
            attempt = {"batch": bid, "registered_at": batch[kind + "_registered_at"], "state": "registered",
                       "input_manifest_sha256": binding["input_manifest"]["sha256"],
                       "work_spec_sha256": binding["work_spec"]["sha256"], "entry_ids": binding["entry_ids"], "worktree": batch["worktree"]}
            plan["attempts"].append(attempt)
        if "native" not in attempt:
            try:
                attempt.update(native=native_start(bid, batch, directory), observed_at=time.time(), state="started")
                attempt["started_at"] = attempt["native"]["started_at"]
                for old_id in binding["entry_ids"]:
                    entry = record["entries"].setdefault(old_id, {"status": "unprocessed", "attempts": []})
                    if not entry["attempts"]:
                        record["cursor"] += 1
                    if bid not in entry["attempts"]:
                        entry["attempts"].append(bid)
                    entry.update(status="started", batch=bid)
            except (OSError, ValueError, KeyError, IndexError, TypeError):
                pass  # Missing/uncertain acceptance preserves the reservation without consuming IDs.
        if kind == "external" and "native" in attempt:
            try:
                launch = json.loads(Path(directory, "learner", bid + ".external-launch.json").read_bytes())
                if (launch.get("batch") == bid and launch.get("source") == source_value(batch, "source")
                        and launch.get("cwd") == batch["worktree"]):
                    attempt["tier_decision"] = launch.get("external_tier")
                    attempt["usage_log"] = launch["log"]
                    attempt["observed_service_tier"] = attempt["native"].get("service_tier")
            except (OSError, ValueError, KeyError, TypeError):
                pass
        plan["state"] = attempt["state"]
        if batch.get("state") not in ("done", "failed", "lost", "awaiting_review"):
            continue
        attempt.update(finished=batch.get("finished"), rc=batch.get("rc"), state=batch["state"])
        attempt["elapsed_seconds"] = None
        if attempt.get("started_at") and batch.get(kind + "_finished_at"):
            started = dt.datetime.fromisoformat(attempt["started_at"].replace("Z", "+00:00")).timestamp()
            elapsed = batch[kind + "_finished_at"] - started
            if elapsed >= 0:
                attempt["elapsed_seconds"] = elapsed
        if "native" in attempt and batch.get("state") == "done" and batch.get(kind + "_result"):
            attempt["destination_files"] = batch.get(kind + "_output_files", [])
            for row in batch[kind + "_result"]:
                entry = record["entries"][row["id"]]
                if entry.get("batch") != bid:
                    continue
                entry.update(status=row["state"], destinations=row["destinations"], reason=row["reason"], batch=bid)
            plan["state"] = "processed" if all(row["state"] == "processed" for row in batch[kind + "_result"]) else "waiting"
        elif "native" in attempt:
            for old_id in binding["entry_ids"]:
                entry = record["entries"][old_id]
                if entry.get("batch") == bid:
                    entry.update(status=batch["state"], batch=bid)
            plan["state"] = batch["state"]
        else:
            plan["state"] = "unverified-start"
    all_ids = {ident for _, batch in own for ident in source_value(batch, "binding")["all_entry_ids"]}
    record.update(total=len(all_ids), processed=sum(record["entries"].get(ident, {}).get("status") == "processed" for ident in all_ids))
    record["remaining"] = record["total"] - record["processed"]
    atomic_json(Path(directory, "strategy-" + kind + "-progress.json"), record)


def reconcile(state, directory, kind="backfill"):
    try:
        _reconcile(state, directory, kind)
    except (OSError, ValueError, KeyError, IndexError, TypeError, AttributeError) as error:
        # An unreadable progress artifact must not lose the normal scheduler transaction.
        state["strategy_" + kind + "_error"] = {"at": time.time(), "reason": str(error)}


def dispatch(state, root, scripts, character, alive, stamp, writer, normal):
    directory = Path(os.environ.get("CODEX_OPS_DIR") or Path(root, "ops/codex-ops"))
    reconcile(state, directory)
    if character != "silent" or not re.fullmatch(r"[0-9]{8}-[0-9]{6}", stamp) or priority_hold(state, character, alive, normal, root=root):
        return None
    try:
        configured = queue(root)
        if not configured["enabled"]:
            return None
        for plan in configured["plans"]:
            ident = plan["plan_id"]
            generation = plan.get("retry_generation", 0)
            if type(generation) is not int or generation < 0:
                raise ValueError("invalid backfill retry generation")
            prior_batches = [(bid, b) for bid, b in state["batches"].items() if b.get("backfill_source") == ident]
            if prior_batches:
                if len(prior_batches) >= 3:
                    continue
                if generation <= max(b["backfill_binding"].get("retry_generation", 0) for _, b in prior_batches):
                    continue
                for bid, old in prior_batches:
                    if old.get("state") not in ("done", "failed") or alive(old.get("pid")):
                        return None
                    # Explicit recovery still requires the original verified retirement;
                    # a dead supervisor or an empty binding never authorizes replay.
                    retired(bid, old, directory)
            binding, _ = source(root, plan)
            binding["retry_generation"] = generation
            for bid, other in state["batches"].items():
                if (other.get("backfill_source") and other["backfill_source"] != ident
                        and set(other["backfill_binding"]["entry_ids"]) & set(binding["entry_ids"])):
                    if other.get("state") not in ("done", "failed") or alive(other.get("pid")):
                        return None
                    retired(bid, other, directory)
            prior = state.get("strategy_backfill", {}).get("entries", {})
            binding["entry_ids"] = [old_id for old_id in binding["entry_ids"] if prior.get(old_id, {}).get("status") != "processed"]
            if not binding["entry_ids"] or any(prior.get(old_id, {}).get("status") not in (None, "waiting", "failed", "lost") for old_id in binding["entry_ids"]):
                continue
            base = subprocess.check_output(["git", "-C", root, "rev-parse", "main"], text=True).strip()
            if not re.fullmatch(r"[0-9a-f]{40}", base):
                raise ValueError("invalid backfill dispatch base")
            launched = writer(state, root, scripts, "strategy-proposal", character, binding["dispatch_runs"],
                              "strategy-backfill:" + ident + ":" + str(generation), "backfill", alive, stamp, backfill_source=ident)
            if launched:
                batch = state["batches"][launched[0]]
                batch.update(backfill_binding={**binding, "dispatch_base": base}, backfill_registered_at=time.time())
            return launched
    except (OSError, ValueError, KeyError, TypeError, RuntimeError, subprocess.SubprocessError) as error:
        state["strategy_backfill_error"] = {"at": time.time(), "reason": str(error)}
    return None


def bound(root, directory, bid, character, tree, ident):
    if character != "silent" or not BATCH.fullmatch(bid) or not ID.fullmatch(ident):
        raise ValueError("invalid backfill host identity")
    batch = json.loads(Path(directory, "learn.json").read_bytes())["batches"][bid]
    expected_tree = str(Path(root).resolve() / ".worktrees" / ("codex-strategy-silent-" + bid.removesuffix("-strategy-proposal")))
    if (tree != expected_tree or any(batch.get(k) != v for k, v in {
            "task": "strategy-proposal", "character": character, "worktree": tree, "backfill_source": ident,
            "reason": "backfill", "key": "strategy-backfill:" + ident + ":" + str(batch.get("backfill_binding", {}).get("retry_generation", 0))}.items())
            or any(k in batch for k in ("research_request", "implementation_request", "learning_request", "proposal_ids", "proposal_repair"))):
        raise ValueError("backfill registration mismatch")
    return batch


def prepare(root, directory, bid, character, tree, ident):
    batch = bound(root, directory, bid, character, tree, ident)
    binding = batch["backfill_binding"]
    configured = queue(root)
    plan = next(plan for plan in configured["plans"] if plan["plan_id"] == ident)
    current, spec = source(root, plan)
    current["retry_generation"] = plan.get("retry_generation", 0)
    selected_ids = binding.get("entry_ids", [])
    current["entry_ids"] = [old_id for old_id in current["entry_ids"] if old_id in selected_ids]
    if not selected_ids or current["entry_ids"] != selected_ids:
        raise ValueError("backfill selection differs from frozen IDs")
    if (not configured["enabled"] or batch["state"] != "running"
            or any(binding.get(k) != v for k, v in current.items()) or batch["runs"] != current["dispatch_runs"]):
        raise ValueError("backfill frozen binding changed")
    base = binding["dispatch_base"]
    if not re.fullmatch(r"[0-9a-f]{40}", base):
        raise ValueError("invalid backfill base")
    return batch, spec


def task_file(root, directory, bid, character, tree, ident):
    batch, spec = prepare(root, directory, bid, character, tree, ident)
    if subprocess.check_output(["git", "-C", tree, "rev-parse", "HEAD"], text=True).strip() != batch["backfill_binding"]["dispatch_base"]:
        raise ValueError("backfill tree differs from dispatch base")
    template = Path(tree, "learner/tasks/strategy-proposal.md").read_text()
    appendix = ("\n\n## 本批后置回刷来源（优先于普通选题及旧专题章节）\n"
                + json.dumps({"batch": bid, "worktree": tree, **{k: v for k, v in batch["backfill_binding"].items() if k != "all_entry_ids"}}, ensure_ascii=False, indent=2)
                + "\n" + spec.decode() + "\n"
                + "只处理绑定的 entry_ids；不读取旧专题请求，不承接旧线程。冻结源从 project_root 的上述精确路径读回。"
                + "HEAD保持dispatch_base，不执行普通选题的git merge；本批先在 scratch 保存策略/rk候选与旧ID去向；正式发布、消费者及科学父仍交原流程，不在本批改源码/正式知识。"
                + "最终JSON必填task=strategy-proposal、character=silent、batch=本批实际ID、base=dispatch_base；runs仅派发锚点。另带backfill_source、input_sha256及backfill_results。"
                + "backfill_results逐entry_id一行 {id,state:processed或waiting,destinations:[{kind:strategy或rk或merged-into,id:目标ID,path:scratch内真实候选文件绝对路径}],reason:具体理由}。"
                + "processed要求至少一个真实候选文件，waiting保留空destinations；缺证允许全waiting。"
                + "tests固定{tsc:null,vitest:null,cases:null}，fixes=[]、merged=null，不冒称live/收益；report为scratch/report.md。\n")
    if "{{" in appendix or "}}" in appendix:
        raise ValueError("backfill text contains template delimiters")
    path = Path(directory, "learner", bid + ".backfill-input", "strategy-proposal.md")
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = (template + appendix).encode()
    if path.exists() and path.read_bytes() != raw:
        raise ValueError("backfill task input already differs")
    path.write_bytes(raw)
    return str(path)


def report_proof(report, batch, root):
    kind = source_kind(batch)
    binding = source_value(batch, "binding")
    directory = Path(os.environ.get("CODEX_OPS_DIR") or Path(root, "ops/codex-ops"))
    bid = Path(batch["worktree"]).name.removeprefix("codex-strategy-silent-") + "-strategy-proposal"
    native_start(bid, batch, directory)
    if (report.get("task") != "strategy-proposal" or report.get("character") != "silent"
            or report.get(kind + "_source") != source_value(batch, "source")
            or report.get("input_sha256") != binding["input_manifest"]["sha256"]
            or report.get("runs") != batch["runs"] or report.get("fixes") != [] or report.get("merged") is not None
            or report.get("tests") != {"tsc": None, "vitest": None, "cases": None}):
        raise ValueError("backfill completion binding mismatch")
    tree = Path(batch["worktree"]).resolve()
    path = Path(report["report"]).resolve()
    if not path.is_relative_to((tree / "learner/runs").resolve()) or not (tree / "learner/runs").resolve().is_relative_to(tree) or path.suffix != ".md":
        raise ValueError("backfill report outside scratch")
    saved = None
    for block in reversed(re.findall(r"```json\s*([\s\S]*?)```", path.read_text())):
        try:
            candidate = json.loads(block)
        except ValueError:
            continue
        if isinstance(candidate, dict) and candidate.get("task") == "strategy-proposal":
            saved = candidate; break
    keys = ("task", "character", "batch", "base", "runs", "fixes", "merged", "tests", kind + "_source", "input_sha256", kind + "_results")
    if not saved or any(saved.get(k) != report.get(k) for k in keys):
        raise ValueError("backfill report differs from preserved output")
    bid = Path(batch["worktree"]).name.removeprefix("codex-strategy-silent-") + "-strategy-proposal"
    if report.get("batch") != bid or report.get("base") != binding["dispatch_base"]:
        raise ValueError("backfill report batch/base mismatch")
    rows = report.get(kind + "_results")
    if (not isinstance(rows, list) or not all(isinstance(row, dict) for row in rows)
            or [row.get("id") for row in rows] != binding["entry_ids"]):
        raise ValueError("backfill needs one ordered disposition per old ID")
    files = []
    for row in rows:
        if (row.get("state") not in ("processed", "waiting") or not isinstance(row.get("reason"), str) or not row["reason"].strip()
                or not isinstance(row.get("destinations"), list) or bool(row["destinations"]) != (row["state"] == "processed")):
            raise ValueError("invalid backfill disposition")
        for target in row["destinations"]:
            if (not isinstance(target, dict) or target.get("kind") not in (("strategy", "rk", "merged-into", "knowledge") if kind == "external" else ("strategy", "rk", "merged-into"))
                    or not isinstance(target.get("id"), str) or not target["id"].strip()):
                raise ValueError("invalid backfill destination")
            candidate = Path(target["path"]).resolve()
            if not candidate.is_relative_to(path.parent) or not candidate.is_file() or candidate == path or candidate.stat().st_size == 0:
                raise ValueError("backfill destination lacks its scratch artifact")
            files.append({("unit_id" if kind == "external" else "old_id"): row["id"], "kind": target["kind"], "id": target["id"],
                          "path": str(candidate), "bytes": candidate.stat().st_size, "sha256": digest(candidate.read_bytes())})
    return {"destination_files": files, "plan_id": source_value(batch, "source"), "report_sha256": digest(path.read_bytes()), "dispositions": rows}


if __name__ == "__main__":
    try:
        action, *args = sys.argv[1:]
        if action == "ready":
            batch, _ = prepare(*args)
            print(batch["backfill_binding"]["dispatch_base"])
        elif action == "prepare":
            print(task_file(*args))
        elif action == "registered":
            bound(*args)
        elif action == "not-started":
            batch = bound(*args)
            root, directory, bid, character, tree, ident = args
            atomic_json(Path(directory, "learner", bid + ".backfill-not-started.json"),
                        {"batch": bid, "source": ident, "worktree": tree, "models_started": 0})
        else:
            raise ValueError("unknown backfill action")
    except (OSError, ValueError, KeyError, IndexError, TypeError, StopIteration, subprocess.SubprocessError) as error:
        sys.stderr.write(str(error) + "\n")
        raise SystemExit(1)
