"""Gate batch finish and pane retirement on persisted native/session/output receipts."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import datetime as dt
import tempfile
import fcntl
import time
import math
import copy
import uuid
import contextlib
from zoneinfo import ZoneInfo


def persist(path, value):
    """Publish only flushed, complete JSON and persist the directory entry as well."""
    path = Path(path)
    with tempfile.NamedTemporaryFile(mode="w", dir=path.parent, prefix=path.name + ".", delete=False) as target:
        temporary = Path(target.name)
        try:
            json.dump(value, target, ensure_ascii=False)
            target.write("\n")
            target.flush()
            os.fsync(target.fileno())
            temporary.replace(path)
        finally:
            temporary.unlink(missing_ok=True)
    fd = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def digest(path):
    value = hashlib.sha256()
    with open(path, "rb") as source:
        for block in iter(lambda: source.read(256 * 1024), b""):
            value.update(block)
        os.fsync(source.fileno())
    return value.hexdigest()


def stopped(receipt):
    pid, original = receipt.get("pid"), receipt.get("birth")
    if type(pid) is not int or pid <= 1 or not original:
        return False
    try:
        fields = Path(f"/proc/{pid}/stat").read_text().rsplit(")", 1)[1].split()
        return fields[0] in ("Z", "X") or fields[19] != original
    except FileNotFoundError:
        return True
    except (OSError, IndexError):
        return False


def prompt_hash(text):
    return hashlib.sha256(text.replace("\r\n", "\n").rstrip().encode()).hexdigest()


def bootstrap_context(row, cwd):
    """Only the observed two-part Codex bootstrap item; task/user events are never context."""
    p = row.get("payload", {})
    parts = p.get("content")
    if (row.get("type") != "response_item" or p.get("type") != "message" or p.get("role") != "user"
            or not isinstance(parts, list) or len(parts) != 2
            or any(not isinstance(part, dict) or part.get("type") != "input_text"
                   or not isinstance(part.get("text"), str) for part in parts)):
        return False
    instructions, environment = (part["text"].replace("\r\n", "\n") for part in parts)
    match = re.match(r"^<environment_context>\n[ \t]*<cwd>([^<\n]+)</cwd>\n", environment)
    return (instructions.startswith(f"# AGENTS.md instructions for {cwd}\n\n<INSTRUCTIONS>\n")
            and instructions.endswith("\n</INSTRUCTIONS>") and instructions.count("</INSTRUCTIONS>") == 1
            and environment.startswith("<environment_context>\n") and environment.endswith("\n</environment_context>")
            and environment.count("<environment_context>") == 1 and environment.count("<cwd>") == 1
            and match is not None and match[1] == cwd)


def native_environment_source(row, turn, bootstrap=False):
    payload = row.get("payload", {})
    meta = payload.get("internal_chat_message_metadata_passthrough")
    if (not isinstance(payload.get("id"), str) or not re.fullmatch(r"msg_[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}", payload["id"])
            or sorted(payload) != ["content", "id", "internal_chat_message_metadata_passthrough", "role", "type"]
            or not isinstance(meta, dict) or sorted(meta) != ["content_item_kinds", "content_item_metadata", "create_time", "turn_id"]
            or meta.get("turn_id") != turn or type(meta.get("create_time")) not in (int, float) or not math.isfinite(meta["create_time"])):
        return False
    try:
        instant = dt.datetime.fromisoformat(str(row.get("timestamp", "")).replace("Z", "+00:00"))
        if math.floor(meta["create_time"] * 1000) != round(instant.timestamp() * 1000):
            return False
    except (ValueError, OverflowError):
        return False
    kinds = ["agents_md.instructions", "environments.environment_context"] if bootstrap else ["environments.environment_context"]
    sources = ["agents_md", "harness"] if bootstrap else ["harness"]
    items = meta.get("content_item_metadata")
    return (meta.get("content_item_kinds") == kinds and isinstance(items, list) and len(items) == len(sources)
            and all(isinstance(item, dict) and list(item) == ["provenance"] and isinstance(item["provenance"], dict)
                    and sorted(item["provenance"]) == (["hook", "type"] if source == "harness" else ["type"])
                    and item["provenance"].get("type") == source
                    and (source != "harness" or item["provenance"].get("hook") is False)
                    for item, source in zip(items, sources)))


def restricted_filesystem(xml, cwd):
    """The same native-only managed/restricted grammar as the TypeScript observer."""
    if re.search(r"[<>&\r\n]", cwd) or len(xml.encode()) > 64 * 1024:
        return False
    prefix = (f'<filesystem><workspace_roots><root>{cwd}</root></workspace_roots>'
              '<permission_profile type="managed"><file_system type="restricted" glob_scan_max_depth="')
    if not xml.startswith(prefix):
        return False
    rest = re.fullmatch(r'[0-9]{1,3}">(.+)</file_system></permission_profile></filesystem>', xml[len(prefix):])
    if not rest:
        return False
    body, at = rest[1], 0
    entry = re.compile(r'<entry access="(?:read|write|deny)"(?: escalatable="false")?><(path|glob|special)>([^<>&\x00-\x1f]+)</\1></entry>')
    while at < len(body):
        match = entry.match(body, at)
        if not match or (match[2] not in (":root", ":slash_tmp", ":tmpdir") if match[1] == "special" else not match[2].startswith("/")):
            return False
        at = match.end()
    return at > 0


def environment_profile(text, timestamp, cwd, bootstrap=False):
    if not isinstance(timestamp, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z", timestamp):
        return None
    try:
        instant = dt.datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except ValueError:
        return None
    start = "<environment_context>\n" + (f"  <cwd>{cwd}</cwd>\n  <shell>bash</shell>\n" if bootstrap else "")
    if not text.startswith(start):
        return None
    fields = re.fullmatch(r"  <current_date>(\d{4}-\d{2}-\d{2})</current_date>\n  <timezone>([A-Za-z0-9_+./-]{1,64})</timezone>\n  (<filesystem>[^\r\n]+</filesystem>)\n</environment_context>", text[len(start):])
    if not fields or not restricted_filesystem(fields[3], cwd):
        return None
    try:
        if instant.astimezone(ZoneInfo(fields[2])).date().isoformat() != fields[1]:
            return None
    except (ValueError, KeyError):
        return None
    return dict(date=fields[1], timezone=fields[2], filesystem=fields[3], timestamp=instant)


def policy_identity(payload):
    return json.dumps([payload.get("approval_policy"), payload.get("sandbox_policy")],
                      ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def reconstruct_native(receipt):
    """Reconstruct one-use native turn bindings from the journaled prompts, never a later human answer."""
    result = receipt["result"]
    bindings = receipt.get("bindings", [])
    submissions = receipt.get("submissions", [])
    if not receipt.get("submitted"):
        if result.get("code") == 0 or bindings:
            raise ValueError("unsubmitted batch cannot complete")
        return
    if not bindings or len(submissions) != len(bindings):
        raise ValueError("not every journaled prompt has native acceptance")
    expected = {item["marker"]: item["prompt_sha256"] for item in submissions}
    turns = {item["turn_id"]: item for item in bindings}
    if len(expected) != len(submissions) or len(turns) != len(bindings):
        raise ValueError("reused prompt marker or native turn")
    if any(expected.get(item["marker"]) != item["prompt_sha256"] for item in bindings):
        raise ValueError("native binding lacks a matching sent prompt")
    if [item["marker"] for item in bindings] != [item["marker"] for item in submissions]:
        raise ValueError("native continuation order differs from dispatch")
    meta, cwd, current, complete = None, None, None, None
    active = False
    accepted = False
    seen = []
    used = set()
    preludes = []
    pending_prelude = None
    context_seen = False
    environment, policy = None, None
    restricted_policy, open_turn = False, False
    updates = []
    environment_ids = set()
    with open(result["rollout"]) as source:
        for line in source:
            if not line.endswith("\n"):
                raise ValueError("native record is not durably complete")
            row = json.loads(line)
            payload = row.get("payload", {})
            if row.get("type") == "session_meta":
                meta, cwd = payload.get("id"), payload.get("cwd")
                if meta != result.get("session") or cwd != receipt.get("cwd"):
                    raise ValueError("native session identity changed")
            if row.get("type") == "event_msg" and payload.get("type") == "task_started":
                if pending_prelude:
                    raise ValueError("bootstrap context never received its matching turn_context")
                context_seen = False
                current = payload.get("turn_id")
                # An explicitly resumed session can have earlier history before this dispatch.
                active = active or current == bindings[0]["turn_id"]
                if active:
                    if current not in turns or current in seen:
                        raise ValueError("unbound or replayed native turn")
                    seen.append(current)
                complete, accepted = None, False
                open_turn = True
            if not active:
                continue
            # The active dispatch boundary was established above; older resume history stays outside it.
            if (not accepted
                    and row.get("type") == "response_item"
                    and (re.search(r"_call(?:_output)?$", str(payload.get("type"))) or payload.get("type") == "reasoning"
                         or (payload.get("type") == "message" and payload.get("role") == "assistant"))):
                raise ValueError("native activity precedes the dispatched prompt")
            if row.get("type") == "turn_context":
                if payload.get("turn_id") != current or payload.get("cwd") != cwd:
                    raise ValueError("native turn context identity changed")
                next_policy = policy_identity(payload)
                if policy is not None and policy != next_policy:
                    raise ValueError("native permission policy changed")
                policy = next_policy
                sandbox = payload.get("sandbox_policy") or {}
                restricted_policy = (payload.get("approval_policy") == "never" and isinstance(sandbox, dict)
                                     and sandbox.get("type") == "workspace-write" and sandbox.get("network_access") is False)
                context_seen = True
                if pending_prelude:
                    preludes.append(pending_prelude)
                    pending_prelude = None
            user = None
            if row.get("type") == "event_msg" and payload.get("type") == "user_message":
                user = payload.get("message", "")
            if row.get("type") == "response_item" and payload.get("type") == "message" and payload.get("role") == "user":
                user = "\n".join(str(part.get("text", "")) for part in payload.get("content", []))
            if user is not None:
                if (meta and cwd and len(seen) == 1 and not accepted and not used and not preludes
                        and not pending_prelude and not context_seen and bootstrap_context(row, cwd)):
                    pending_prelude = {"turn_id": current, "cwd": cwd, "sha256": prompt_hash(user)}
                    environment = (environment_profile(payload["content"][1]["text"].replace("\r\n", "\n"), row.get("timestamp"), cwd, True)
                                   if native_environment_source(row, current, True) else None)
                    if environment:
                        environment_ids.add(payload["id"])
                    continue
                parts = payload.get("content")
                if (accepted and open_turn and environment and restricted_policy and context_seen
                        and current in turns
                        and row.get("type") == "response_item" and payload.get("type") == "message" and payload.get("role") == "user"
                        and isinstance(parts, list) and len(parts) == 1 and isinstance(parts[0], dict)
                        and parts[0].get("type") == "input_text" and isinstance(parts[0].get("text"), str)
                        and sorted(parts[0]) == ["text", "type"] and native_environment_source(row, current)
                        and payload["id"] not in environment_ids and len(environment_ids) < 1024):
                    update = environment_profile(parts[0]["text"].replace("\r\n", "\n"), row.get("timestamp"), cwd)
                    days = (dt.date.fromisoformat(update["date"]) - dt.date.fromisoformat(environment["date"])).days if update else -1
                    if (update and update["timezone"] == environment["timezone"] and update["filesystem"] == environment["filesystem"]
                            and update["timestamp"] >= environment["timestamp"] and days in (0, 1)):
                        environment = update
                        environment_ids.add(payload["id"])
                        updates.append(dict(session=meta, turn_id=current, cwd=cwd, timestamp=row["timestamp"], message_id=payload["id"],
                                            current_date=update["date"], timezone=update["timezone"],
                                            filesystem_sha256=prompt_hash(update["filesystem"]), sha256=prompt_hash(user)))
                        continue
                if pending_prelude:
                    raise ValueError("dispatched prompt precedes bootstrap turn_context")
                binding = turns.get(current, {})
                marker = user.replace("\r\n", "\n").split("\n")[0]
                if marker != binding.get("marker") or prompt_hash(user) != binding.get("prompt_sha256"):
                    raise ValueError("native user input is not the dispatched prompt")
                if not accepted and marker in used:
                    raise ValueError("prompt marker was consumed by another turn")
                used.add(marker)
                accepted = True
            if row.get("type") == "event_msg" and payload.get("type") in ("task_complete", "turn_aborted"):
                if payload.get("turn_id") == current:
                    open_turn = False
                    complete = payload.get("last_agent_message") if payload.get("type") == "task_complete" and accepted else None
    if (meta != result.get("session") or cwd != receipt.get("cwd") or not accepted
            or current != result.get("turn") or seen != [item["turn_id"] for item in bindings]
            or len(used) != len(submissions)):
        raise ValueError("final native turn is not bound to this dispatch")
    if pending_prelude or (preludes and receipt.get("native_context_version") != 1) or receipt.get("native_preludes", []) != preludes:
        raise ValueError("native bootstrap proof differs from the original dispatch")
    if result.get("code") == 0 and (not complete or complete != result.get("message")):
        raise ValueError("matching native task completion is missing")
    return updates


def verify_native(receipt):
    updates = reconstruct_native(receipt)
    if updates is None:
        return
    if (updates and receipt.get("native_environment_version") != 1) or receipt.get("native_environment_updates", []) != updates:
        raise ValueError("native environment proof differs from the original dispatch")


def verify(path, output):
    receipt = json.loads(Path(path).read_text())
    if "agent_name" in receipt or "agent_name_version" in receipt:
        binding = json.dumps([receipt["label"], receipt["pane"], os.path.abspath(receipt["cwd"])],
                             ensure_ascii=False, separators=(",", ":"))
        expected = "learner-" + hashlib.sha256(binding.encode()).hexdigest()[:24]
        if receipt.get("agent_name_version") != 1 or receipt.get("agent_name") != expected:
            raise ValueError("native agent name is not bound to the original pane/label/cwd")
    result = receipt.get("result", {})
    if receipt.get("state") == "not-started" and result.get("code") == 3 and receipt.get("models_started") == 0:
        if (receipt.get("submitted") or receipt.get("bindings") or receipt.get("submissions") or receipt.get("pid")
                or any(receipt.get(key) or result.get(key) for key in ("session", "turn", "rollout"))):
            raise ValueError("not-started receipt contains model activity")
        receipt["output"] = {"path": str(output), "sha256": digest(output)}
        persist(path, receipt)
        return receipt
    artifacts = receipt.get("artifacts", {})
    if (receipt.get("state") != "session-ended" or receipt.get("retirement_authorized") is not True
            or not result.get("stopped") or not stopped(receipt)
            or not artifacts.get("summary") or digest(artifacts["log"]) != artifacts.get("sha256")):
        raise ValueError("native session retirement or original learner log is unverified")
    last = None
    with open(artifacts["log"]) as source:
        for line in source:
            row = json.loads(line)
            if row.get("type") == "learner_summary":
                last = row
    if (not last or last.get("exit_code") != result.get("code")
            or last.get("summary", {}).get("sessionId") != result.get("session")):
        raise ValueError("matching learner summary is missing")
    verify_native(receipt)
    if not Path(output).is_file() or Path(output).stat().st_size == 0:
        raise ValueError("original batch output is missing")
    receipt["output"] = {"path": str(output), "sha256": digest(output)}
    artifacts["out_pending_wrapper_flush"] = False
    persist(path, receipt)
    return receipt


def verified_code(path, output, launcher_rc):
    receipt = verify(path, output)
    code = receipt["result"]["code"]
    # The interactive launcher's error summary maps a preflight refusal to 1.
    if int(launcher_rc) != code and not (receipt["state"] == "not-started" and code == 3 and int(launcher_rc) == 1):
        raise ValueError("launcher exit differs from the original transport result")
    return code


def verification_blocked(path, launcher_rc):
    """A final failed producer cannot become verified by polling it; this grants only a hold."""
    raw = Path(path).read_bytes()
    receipt = json.loads(raw)
    result, artifacts = receipt.get("result", {}), receipt.get("artifacts", {})
    if (int(launcher_rc) != 75 or receipt.get("state") != "needs-attention"
            or result.get("code") != 75 or result.get("reason") != "retirement-unverified"
            or result.get("stopped") is not False or receipt.get("retirement_authorized") is not False
            or artifacts.get("summary") is not True or digest(artifacts["log"]) != artifacts.get("sha256")):
        return False
    last = None
    with open(artifacts["log"]) as source:
        for line in source:
            row = json.loads(line)
            if row.get("type") == "learner_summary":
                last = row
    return (bool(last) and last.get("exit_code") == 75
            and last.get("summary", {}).get("sessionId") == result.get("session")
            and Path(path).read_bytes() == raw)


def finished(state, batch, path, output, launcher_rc, supervisor):
    """Record the original finish transaction; tab retirement belongs to the #20 adapter."""
    code = verified_code(path, output, launcher_rc)
    receipt = json.loads(Path(path).read_text())
    value = json.loads(Path(state).read_text())["batches"][batch]
    supervisor = int(supervisor)
    label = "learner-" + batch + ("-postmortem" if value.get("task", "postmortem") == "postmortem" else "")
    fields = Path(f"/proc/{supervisor}/stat").read_text().rsplit(")", 1)[1].split()
    if (value.get("pid") != supervisor or supervisor != os.getppid() or supervisor <= 1 or fields[0] in ("Z", "X")
            or value.get("state") not in ("done", "failed", "rejected") or not value.get("finished")
            or value.get("rc") != code or code == 75
            or value.get("pane") != receipt.get("pane") or not receipt.get("pane")
            or receipt.get("label") != label
            or Path(value.get("worktree", Path(state).parents[2])).resolve() != Path(receipt.get("cwd", "")).resolve()):
        raise ValueError("original terminal batch or supervisor authority is missing")
    # Native rc describes transport completion; the finish audit owns semantic done/failed/rejected.
    receipt["wrapper"] = {"version": 1, "batch": batch, "state": value["state"], "rc": code,
        "launcher_rc": int(launcher_rc), "finished": value["finished"],
        "supervisor": {"pid": supervisor, "birth": fields[19]},
        "batch_sha256": hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()}
    persist(path, receipt)


def attention(directory, batch, stage):
    """One durable exception notification per wrapper/stage, independent of an ops model turn."""
    if not re.fullmatch(r"[a-z0-9-]+", batch) or stage not in ("verify", "finish", "seal", "registration", "recovery"):
        raise ValueError("invalid wrapper attention identity")
    directory = Path(directory)
    record = directory / "learner" / f"{batch}.wrapper-attention-{stage}.json"
    queue = directory / "queue"
    queue.mkdir(parents=True, exist_ok=True)
    record.parent.mkdir(parents=True, exist_ok=True)
    if record.exists():
        return
    # Persist the notification before its deduplication receipt; an interrupted enqueue is retried.
    # Keep the existing queue reader's <epoch-ns>-<kind>.md grammar, including after a retry.
    existing = list(queue.glob(f"*-wrapper-{batch}-{stage}-learner-tui-attention.md"))
    message = existing[0] if existing else queue / f"{time.time_ns()}-wrapper-{batch}-{stage}-learner-tui-attention.md"
    if not message.exists():
        with message.open("w") as target:
            target.write(f"学习批次 {batch} wrapper {stage} 核验未通过；保留原回执、批次与 pane，交原 ops 核验，不另开模型、不自行关 tab。\n")
            target.flush()
            os.fsync(target.fileno())
        fd = os.open(queue, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(fd)
        finally:
            os.close(fd)
    persist(record, {"batch": batch, "stage": stage, "at": dt.datetime.now().astimezone().isoformat(),
                     "notification": str(message)})


REGISTRATION_FIELDS = ("pid", "pane", "started", "task", "character", "worktree", "key", "runs",
                       "learner_task", "feature_request", "research_request", "implementation_request", "backfill_source", "backfill_binding", "external_source", "external_binding")


def apply_deferrals(state, directory):
    """Replay a durable hold after lock contention, before a dead supervisor can become a retry."""
    changed = False
    for path in (Path(directory) / "learner").glob("*.verification-deferred.json"):
        record = json.loads(path.read_text())
        batch = state.get("batches", {}).get(record.get("batch"))
        registration = record.get("registration")
        if (not batch or not isinstance(registration, dict) or batch.get("state") != "running"
                or batch.get("pid") != record.get("supervisor", {}).get("pid")
                or any(batch.get(key) != registration.get(key) for key in REGISTRATION_FIELDS)):
            continue
        if record.get("wait_for_owner_exit") is True:
            owner_birth = record.get("supervisor", {}).get("birth")
            if isinstance(owner_birth, str) and process_birth(record["supervisor"]["pid"]) == owner_birth:
                continue
            attention(directory, record["batch"], "recovery")
        reason = "terminal-unverified-receipt" if record.get("reason") == "terminal-unverified-receipt" else "tui-verification-timeout"
        batch.update(state="awaiting_review", review_required="recovery-supervisor-exited" if record.get("wait_for_owner_exit") is True else reason,
                     deferred_at=record["at"], verification_deferred=str(path))
        changed = True
    return changed


def defer(state, batch, path, output, launcher_rc, supervisor, *, terminal_unverified=False):
    """Release only our scheduler lease; preserve the native receipt, model and original demand."""
    state = Path(state)
    directory = state.parent
    supervisor = int(supervisor)
    if supervisor != os.getppid() or supervisor <= 1 or not re.fullmatch(r"[a-z0-9-]+", batch):
        raise ValueError("deferral does not belong to the invoking supervisor")
    fields = Path(f"/proc/{supervisor}/stat").read_text().rsplit(")", 1)[1].split()
    try:
        current = json.loads(state.read_text())
    except (OSError, ValueError):
        current = {}
    original = current.get("batches", {}).get(batch, {})
    record_path = directory / "learner" / f"{batch}.verification-deferred.json"
    if record_path.exists():
        record = json.loads(record_path.read_text())
        if record.get("supervisor") != {"pid": supervisor, "birth": fields[19]}:
            raise ValueError("deferral belongs to another supervisor")
    else:
        record = {"schema": "learner-verification-deferred-v1", "batch": batch,
            "at": dt.datetime.now().astimezone().isoformat(), "reason": "terminal-unverified-receipt" if terminal_unverified else "tui-verification-timeout",
            "supervisor": {"pid": supervisor, "birth": fields[19]}, "launcher_rc": int(launcher_rc),
            "receipt": str(path), "output": str(output), "finish_authorized": False,
            "retirement_authorized": False, "automatic_replay_authorized": False,
            "registration": {key: original.get(key) for key in REGISTRATION_FIELDS}}
        persist(record_path, record)
    # Journal first: the next original scheduler tick applies the hold if its lock is busy now.
    until = time.monotonic() + 2
    with (directory / "learn.lock").open("a") as lock:
        while True:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                latest = json.loads(state.read_text())
                if apply_deferrals(latest, directory):
                    persist(state, latest)
                break
            except BlockingIOError:
                if time.monotonic() >= until:
                    break
                time.sleep(0.05)
    if not record.get("inbox_notice"):
        # Mark the append uncertain first; a crash must not produce repeated supervisor notifications.
        record["inbox_notice"] = "sending"
        persist(record_path, record)
        with (directory / "inbox-claude.md").open("a") as inbox:
            inbox.write(f"- {record['at']} [dev #36 wrapper] 学习批次 {batch} 回执核验未通过（{record['reason']}），监督退出、原批次待核；原产物/回执/pane保留，不自动重派原任务、不认完成，见 learner/{record_path.name}。\n")
            inbox.flush()
            os.fsync(inbox.fileno())
        record["inbox_notice"] = "written"
        persist(record_path, record)


def close(root, state, batch, path, output):
    receipt = verify(path, output)
    value = json.loads(Path(state).read_text())["batches"][batch]
    if (value.get("state") not in ("done", "failed", "rejected")
            or value.get("rc") != receipt["result"].get("code") or value.get("rc") == 75):
        raise ValueError("batch has not reached a verified original finish transaction")
    herdr = os.environ.get("HERDR_BIN", "herdr")
    pane = receipt["pane"]
    info = json.loads(subprocess.check_output([herdr, "pane", "get", pane]))["result"]["pane"]
    if any(info.get(k) != receipt["identity"].get(k) for k in ("pane_id", "label", "tab_id", "terminal_id", "workspace_id")):
        raise ValueError("pane identity changed; retain it")
    process = json.loads(subprocess.check_output([herdr, "pane", "process-info", "--pane", pane]))["result"]["process_info"]
    if process["shell_pid"] != process["foreground_process_group_id"]:
        raise ValueError("pane is active; retain it")
    subprocess.run(["bash", str(Path(root) / "ops/herdr-host.sh"), "close", receipt["label"],
                    "--pane", pane, "--require-idle"], check=True)


def process_birth(pid):
    try:
        fields = Path(f"/proc/{pid}/stat").read_text().rsplit(")", 1)[1].split()
        return None if fields[0] in ("Z", "X") else fields[19]
    except FileNotFoundError:
        return None


@contextlib.contextmanager
def recovery_state_lock(directory):
    with (Path(directory) / "learn.lock").open("a") as lock:
        until = time.monotonic() + 2
        while True:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                if time.monotonic() >= until:
                    raise ValueError("registration lock busy")
                time.sleep(0.05)
        yield


def recovery_native(receipt):
    """Build a new producer result from the exact completed original turn, never from a screen."""
    native = Path(receipt["rollout"])
    with native.open("rb") as stream:
        data = stream.read(64 * 1024 * 1024 + 1)
    if len(data) > 64 * 1024 * 1024 or not data.endswith(b"\n"):
        raise ValueError("native recovery snapshot is incomplete or oversized")
    message, error, turn = None, False, None
    for line in data.splitlines():
        row = json.loads(line)
        payload = row.get("payload", {})
        if row.get("type") == "event_msg" and payload.get("type") == "task_started":
            turn, error, message = payload.get("turn_id"), False, None
        if turn == receipt["turn"] and row.get("type") == "event_msg":
            if payload.get("type") == "error":
                error = True
            if payload.get("type") == "task_complete" and payload.get("turn_id") == turn:
                message = payload.get("last_agent_message")
            if payload.get("type") == "turn_aborted":
                message = None
    if (turn != receipt["turn"] or not isinstance(message, str) or not message.strip() or error
            or re.search(r"at capacity|rate.?limit|stream disconnected|reconnecting|error sending request", message, re.I)):
        raise ValueError("original turn has no successful native completion")
    candidate = copy.deepcopy(receipt)
    # The old transport stopped early; its partial usage is retained only in the archived origin result.
    candidate["result"].pop("usage", None)
    candidate["result"].update(code=0, message=message, session=receipt["session"], turn=receipt["turn"], rollout=str(native))
    candidate.update(native_environment_version=1, native_environment_updates=reconstruct_native(candidate))
    verify_native(candidate)
    if digest(native) != hashlib.sha256(data).hexdigest():
        raise ValueError("native snapshot changed during validation")
    return candidate, data


def recover_completed(root, directory, batch, expected_sha, *, apply=False, h=None, finish_runner=None,
                      birth_fn=process_birth, clock=time.monotonic, pause=time.sleep):
    """Explicit new supervisor transaction for a completed retained postmortem/experience turn."""
    root, directory = Path(root).resolve(), Path(directory).resolve()
    if (not directory.is_relative_to(root / "ops") or not re.fullmatch(r"[0-9]{8}-[0-9]{6}(?:-experience-update)?", batch)
            or not re.fullmatch(r"[a-f0-9]{64}", expected_sha)):
        raise ValueError("invalid recovery identity")
    state_path = directory / "learn.json"
    before = json.loads(state_path.read_text())
    original_row = before["batches"][batch]
    task = original_row.get("task", "postmortem")
    if task not in ("postmortem", "experience-update"):
        raise ValueError("unsupported retained task")
    label = "learner-" + batch + ("-postmortem" if task == "postmortem" else "")
    path = directory / "learner" / (label + ".tui.json")
    output = directory / "learner" / (batch + ".out")
    raw = path.read_bytes()
    original = json.loads(raw)
    native = Path(original["rollout"]).resolve()
    if (hashlib.sha256(raw).hexdigest() != expected_sha or not native.is_relative_to(root) or "sessions" not in native.parts or native.suffix != ".jsonl"
            or original.get("state") != "needs-attention" or original.get("result", {}).get("code") != 75
            or original.get("submitted") is not True or not original.get("bindings") or original.get("retirement_authorized") is not False
            or original.get("result", {}).get("stopped") is not False or original.get("wrapper")
            or original.get("label") != label or original_row.get("pane") != original.get("pane")
            or ("worktree" in original_row and not isinstance(original_row["worktree"], str))
            or str(Path(original_row.get("worktree") or root).resolve()) != original.get("cwd")
            or original_row.get("state") not in ("lost", "awaiting_review", "running")
            or any(original_row.get(k) is not None for k in ("rc", "finished")) or original_row.get("cancelled")
            or original_row.get("tui_recovery") or type(original_row.get("pid")) is not int or original_row["pid"] <= 1
            or birth_fn(original_row["pid"]) is not None):
        raise ValueError("original supervisor or recovery registration is not available")
    candidate, native_data = recovery_native(original)
    # Validate the bounded full-label/native-name binding before claiming any control.
    binding = json.dumps([label, original["pane"], os.path.abspath(original["cwd"])], ensure_ascii=False, separators=(",", ":"))
    if (original.get("agent_name_version") != 1 or original.get("agent_name") != "learner-" + hashlib.sha256(binding.encode()).hexdigest()[:24]
            or original.get("result", {}).get("rollout") != original["rollout"]
            or not isinstance(original.get("birth"), str) or not re.fullmatch(r"[0-9]+", original["birth"])
            or type(original.get("pid")) is not int or original["pid"] <= 1):
        raise ValueError("original native name or process identity differs")
    native_sha = hashlib.sha256(native_data).hexdigest()
    if not apply:
        return dict(batch=batch, state="eligible-for-identity-check", apply=False, origin_sha256=expected_sha,
                    native_sha256=native_sha, environment_updates=len(candidate["native_environment_updates"]),
                    finish_authorized=False, retirement_authorized=False)
    if h is None:
        def h(args):
            reply = subprocess.run([os.environ.get("HERDR_BIN", "herdr"), *args], check=True, capture_output=True, timeout=20)
            return reply.stdout.decode() if args[:2] == ["pane", "read"] else json.loads(reply.stdout)["result"]
    if finish_runner is None:
        def finish_runner(stage, argv):
            script = root / "ops" / ("codex-ops-learn.py" if stage == "finish" else "learner_tui.py")
            subprocess.run([sys.executable, str(script), *argv], cwd=root, check=True, timeout=120, capture_output=True,
                           env={**os.environ, "CODEX_OPS_ROOT": str(root), "CODEX_OPS_DIR": str(directory)})
    import issue_session
    owner = os.getpid()
    owner_birth = process_birth(owner)
    if not owner_birth:
        raise ValueError("recovery supervisor identity unavailable")
    attempt = directory / "learner" / (batch + ".recovery-" + uuid.uuid4().hex)
    journal = dict(schema="learner-tui-completed-recovery-v1", batch=batch, phase="preparing", origin_sha256=expected_sha,
                   supervisor=dict(pid=owner, birth=owner_birth), controls=[], native_sha256=native_sha)
    claimed = False
    with (directory / "learner" / (batch + ".recovery.lock")).open("a") as lease:
        fcntl.flock(lease, fcntl.LOCK_EX | fcntl.LOCK_NB)
        try:
            with recovery_state_lock(directory):
                state = json.loads(state_path.read_text())
                if state["batches"].get(batch) != original_row or digest(path) != expected_sha or birth_fn(original_row["pid"]) is not None:
                    raise ValueError("recovery predecessor changed")
                attempt.mkdir(mode=0o700)
                for name, data in (("original.tui.json", raw), ("original.out", output.read_bytes()),
                                   ("native.jsonl", native_data), ("original.registration.json", json.dumps(original_row).encode())):
                    target = attempt / name
                    with target.open("xb") as archive:
                        os.fchmod(archive.fileno(), 0o600); archive.write(data); archive.flush(); os.fsync(archive.fileno())
                archived_output_sha = digest(attempt / "original.out")
                if digest(output) != archived_output_sha:
                    raise ValueError("original output changed during archival")
                journal.update(phase="claimed", archive=str(attempt), original_output_sha256=archived_output_sha)
                persist(attempt / "recovery.json", journal)
                current = copy.deepcopy(original_row)
                guard = directory / "learner" / (attempt.name + ".verification-deferred.json")
                current.update(state="running", pid=owner, tui_recovery=dict(version=1, archive=str(attempt), origin_sha256=expected_sha,
                                                                          supervisor=dict(pid=owner, birth=owner_birth), liveness_guard=str(guard)))
                # Arm the existing pre-lost deferral gate before publishing the new owner.
                # A killed recovery supervisor cannot silently become a replayable lost batch.
                persist(guard, dict(schema="learner-verification-deferred-v1", batch=batch, wait_for_owner_exit=True,
                                    at=dt.datetime.now().astimezone().isoformat(), reason="recovery-supervisor-exited",
                                    supervisor=dict(pid=owner, birth=owner_birth), registration=current,
                                    finish_authorized=False, retirement_authorized=False, automatic_replay_authorized=False))
                state["batches"][batch] = current
                claimed = True
                persist(state_path, state)

            def authority():
                if (json.loads(state_path.read_text())["batches"].get(batch) != current or digest(path) != expected_sha
                        or digest(native) != native_sha or digest(output) != journal["original_output_sha256"]):
                    raise ValueError("recovery lease or original evidence changed")
                pane = h(["pane", "get", original["pane"]])["pane"]
                if any(not original.get("identity", {}).get(k) or pane.get(k) != original["identity"][k]
                       for k in ("pane_id", "tab_id", "terminal_id", "workspace_id")):
                    raise ValueError("original pane changed")
                process = h(["pane", "process-info", "--pane", original["pane"]])["process_info"]
                live = birth_fn(original["pid"])
                if live is not None and live != original["birth"]:
                    raise ValueError("native PID was reused")
                if live is not None:
                    agent = h(["agent", "get", original["pane"]])["agent"]
                    if (agent.get("agent") != "codex" or agent.get("pane_id") != original["pane"] or agent.get("name") != original["agent_name"]
                            or agent.get("foreground_cwd") != original["cwd"] or agent.get("agent_status") not in ("idle", "done")
                            or process.get("foreground_process_group_id") != original["pid"]):
                        raise ValueError("completed original TUI is not idle and owned")
                    screen = h(["pane", "read", original["pane"], "--source", "visible", "--format", "ansi"])
                    if issue_session.composer_state(screen) != "empty" or "Queued follow-up inputs" in screen:
                        raise ValueError("pending input prevents native retirement")
                elif process.get("foreground_process_group_id") not in (process.get("shell_pid"), original["pid"]):
                    raise ValueError("native exit did not return to the original shell")
                if (json.loads(state_path.read_text())["batches"].get(batch) != current or digest(path) != expected_sha
                        or digest(native) != native_sha or birth_fn(original["pid"]) != live):
                    raise ValueError("final recovery authority changed")
                return "owned" if live is not None else "exited" if process.get("shell_pid") == process.get("foreground_process_group_id") else "waiting"

            deadline = clock() + 10
            disposition = authority()
            while disposition != "exited":
                if clock() >= deadline:
                    raise ValueError("original native retirement timed out")
                if disposition == "owned":
                    journal["controls"].append(dict(key="ctrl+c", at=dt.datetime.now().astimezone().isoformat()))
                    persist(attempt / "recovery.json", journal)
                    h(["agent", "send-keys", original["pane"], "ctrl+c"])
                pause(0.1)
                disposition = authority()
            # Publish a new producer epoch only after actual retirement. All predecessor bytes stay archived.
            candidate.update(state="session-ended", retirement_authorized=True,
                             recovery=dict(version=1, archive=str(attempt), origin_sha256=expected_sha,
                                           origin_result=original["result"], supervisor=dict(pid=owner, birth=owner_birth)))
            candidate["result"].update(reason="recovered-native-task-complete", stopped=True)
            log = attempt / "completion.jsonl"
            rows = [dict(type="learner_tui_recovery", origin_sha256=expected_sha, native_sha256=native_sha),
                    dict(type="learner_summary", exit_code=0, summary=dict(engine="codex", sessionId=original["session"], status="turn.completed"))]
            with log.open("x") as target:
                os.fchmod(target.fileno(), 0o600)
                target.write("".join(json.dumps(row) + "\n" for row in rows)); target.flush(); os.fsync(target.fileno())
            candidate["artifacts"] = dict(log=str(log), sha256=digest(log), summary=True, out_pending_wrapper_flush=False)
            if digest(output) != journal["original_output_sha256"]:
                raise ValueError("original output changed before recovery append")
            with output.open("ab") as target:
                target.write(("\n" + candidate["result"]["message"] + "\n").encode()); target.flush(); os.fsync(target.fileno())
            fresh = attempt / "completed.tui.json"
            persist(fresh, candidate)
            verified = verify(fresh, output)
            with recovery_state_lock(directory):
                state = json.loads(state_path.read_text())
                if state["batches"].get(batch) != current or digest(path) != expected_sha:
                    raise ValueError("recovery registration changed before publication")
                persist(path, verified)
            journal["phase"] = "native-retired-and-published"; persist(attempt / "recovery.json", journal)
            finish_runner("finish", ["finish", "--batch", batch, "--rc", "0", "--character", str(original_row.get("character", "silent"))])
            finish_runner("finished", ["finished", str(state_path), batch, str(path), str(output), "0", str(owner)])
            journal["phase"] = "finished"; persist(attempt / "recovery.json", journal)
            terminal = json.loads(state_path.read_text())["batches"][batch]
            return dict(batch=batch, state="finished", batch_state=terminal["state"], native_rc=0,
                        archive=str(attempt), seal="pending-original-20-gate")
        except BaseException:
            if claimed:
                journal["phase"] = "awaiting-review"; persist(attempt / "recovery.json", journal)
                with recovery_state_lock(directory):
                    state = json.loads(state_path.read_text()); row = state["batches"].get(batch)
                    if row == current:
                        row.update(state="awaiting_review", review_required="tui-recovery-unverified")
                        persist(state_path, state)
            raise


def main(argv):
    try:
        if argv[0] == "verify" and len(argv) == 3:
            verify(*argv[1:])
        elif argv[0] == "verified-code" and len(argv) == 4:
            print(verified_code(*argv[1:]))
        elif argv[0] == "verification-blocked" and len(argv) == 3:
            return 0 if verification_blocked(*argv[1:]) else 75
        elif argv[0] == "finished" and len(argv) == 7:
            finished(*argv[1:])
        elif argv[0] == "attention" and len(argv) == 4:
            attention(*argv[1:])
        elif argv[0] == "defer" and len(argv) in (7, 8):
            if len(argv) == 8 and argv[7] != "--terminal-unverified":
                return 2
            defer(*argv[1:7], terminal_unverified=len(argv) == 8)
        elif argv[0] == "close" and len(argv) == 6:
            close(*argv[1:])
        elif argv[0] == "recover-completed" and len(argv) in (5, 6):
            if len(argv) == 6 and argv[5] != "--apply":
                return 2
            print(json.dumps(recover_completed(*argv[1:5], apply=len(argv) == 6), ensure_ascii=False))
        else:
            return 2
        return 0
    except (OSError, ValueError, KeyError, TypeError, IndexError, subprocess.SubprocessError):
        sys.stderr.write("learner TUI receipt/retirement gate deferred; preserve original batch and pane\n")
        return 75


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
