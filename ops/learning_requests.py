"""Durable learning goals, separate from individual learner process completion.

The existing scheduler owns learn.lock. No second scheduler, implicit redispatch,
permission expansion or overwrite of a previous batch is introduced here.
"""
import argparse
from contextlib import contextmanager
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time

ID = re.compile(r"[a-z][a-z0-9-]{2,100}")
UUID = re.compile(r"[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}")


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()


def atomic(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + f".{os.getpid()}.tmp")
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    os.replace(tmp, path)


def artifact(root, ref):
    path = (Path(root) / ref["path"]).resolve()
    if not path.is_relative_to(Path(root).resolve()) or path.is_symlink():
        raise ValueError("artifact outside project")
    raw = path.read_bytes()
    if digest(raw) != ref["sha256"]:
        raise ValueError("frozen artifact SHA mismatch: " + str(path))
    return raw


def ack_request(root, state, notice, payload):
    """Resolve delivery ownership before writing any ACK; ordinary notices have no learning parent."""
    token = digest(canonical([notice.get("request_sha256"), notice.get("kind"), notice.get("message")]))[:24]
    feature = notice.get("source_kind") in ("feature", "boss-sim")
    payload_id = payload.get("notice_id")
    if notice.get("source_kind") == "boss-sim" and payload.get("stage") == "ops_forwarded":
        payload_id = payload_id or payload.get("delivery_token")
    if notice.get("id") != payload_id:
        raise ValueError("notice identity or frozen content mismatch")
    if not feature and notice.get("id") != token:
        raise ValueError("notice identity or frozen content mismatch")
    request_id = notice.get("request_id")
    record = state.get("learning_requests", {}).get(request_id)
    if record is not None:
        if feature or notice.get("notification_only") is True or notice.get("registered_learning_request") is False:
            raise ValueError("ordinary notification scope conflicts with a registered learning request")
        return record
    if notice.get("notification_only") is not True or notice.get("registered_learning_request") is not False:
        raise ValueError("unknown learning request; ordinary notification scope must be explicit")
    if feature:
        return (ack_boss_sim(root, state, notice, payload) if notice["source_kind"] == "boss-sim"
                else ack_feature(root, state, notice, payload))
    if notice.get("source_kind") == "legacy-continuation":
        return ack_legacy_continuation(root, state, notice, payload)
    match = re.fullmatch(r"([a-z][a-z0-9_]*)-proposal-[0-9a-f]{16}", request_id or "")
    if not match or not re.fullmatch(r"[0-9a-f]{64}", notice.get("request_sha256", "")):
        raise ValueError("ordinary notice must identify an existing character proposal")
    source = json.loads(artifact(root, notice["source_evidence"]))
    if (source.get("proposal_id") != request_id or source.get("batch") != notice.get("source_batch")
            or not re.fullmatch(r"\d{8}-\d{6}-(?:(?:postmortem|experience-update|strategy-proposal)(?:-s2)?|s2-strategy-proposal)",
                                notice.get("source_batch", ""))
            or source.get("original_proposal_sha256") != notice.get("request_sha256")):
        raise ValueError("ordinary notice source identity or SHA mismatch")
    from proposal_dispatch import library
    proposals = library(Path(root) / "ops")
    proposal = proposals.fold(Path(root) / proposals.QUEUE).get(request_id)
    character = match.group(1)
    if (not proposal or proposal.get("character") != character
            or proposal.get("proposal_sha256") != notice.get("request_sha256")
            or notice.get("character", character) != character
            or payload.get("character", character) != character):
        raise ValueError("unknown proposal or mismatched character/proposal SHA")
    return None


def ack_legacy_continuation(root, state, notice, payload):
    """Bind a historical same-thread continuation without inventing a feature or learning parent."""
    batch_id = notice.get("source_batch", "")
    batch = state.get("batches", {}).get(batch_id, {})
    parent_id = batch.get("continuation_parent_batch")
    parent = state.get("batches", {}).get(parent_id, {})
    character = batch.get("character")
    thread = batch.get("resume_thread", "")
    request = batch.get("continuation_supplement_id", "")
    if (not re.fullmatch(r"\d{8}-\d{6}-fix-batch", batch_id) or batch.get("task") != "fix-batch"
            or not parent_id or parent.get("task") != "fix-batch" or batch.get("feature_request")
            or not character or parent.get("character") != character or notice.get("character") != character
            or payload.get("character", character) != character or not UUID.fullmatch(thread)
            or not ID.fullmatch(request) or notice.get("request_id") != request
            or notice.get("original_parent_batch") != parent_id or notice.get("original_thread") != thread
            or batch.get("worktree") != parent.get("worktree")):
        raise ValueError("legacy continuation must match its registered parent, character and resume thread")
    tree = Path(batch["worktree"]).resolve()
    if tree.parent != (Path(root) / ".worktrees").resolve():
        raise ValueError("legacy continuation worktree outside project")
    frozen = batch["continuation_input"]
    approved = json.loads(artifact(root, frozen))
    if (approved.get("supplement_id") != request or approved.get("parent_batch") != parent_id
            or approved.get("same_thread") != thread):
        raise ValueError("legacy continuation frozen input identity mismatch")
    report_path = batch.get("report", {}).get("report")
    if not isinstance(report_path, str):
        raise ValueError("legacy continuation original report missing")
    scratch = (Path(root) / report_path).resolve().parent
    if scratch.parent not in ((Path(root) / "learner/runs").resolve(), tree / "learner/runs"):
        raise ValueError("legacy continuation scratch outside registered project")
    source_path = (Path(root) / notice["source_evidence"]["path"]).resolve()
    original = artifact(root, notice["source_evidence"])
    source = json.loads(original)
    if (source_path.parent != scratch or source.get("supplement_id") != request
            or source.get("parent_batch") != parent_id or source.get("thread") != thread
            or digest(original) != notice.get("request_sha256")
            or not isinstance(notice.get("message"), str) or original != notice["message"].encode("utf8")):
        raise ValueError("legacy continuation producer words or SHA mismatch")
    if artifact(root, source["evidence"]) != artifact(root, notice["counterexamples"]):
        raise ValueError("legacy continuation counterexample SHA mismatch")
    # Preserve root scratch compatibility, but authenticate the actual launch and consumed input.
    log_path = scratch.with_suffix(".jsonl")
    events = [json.loads(line) for line in log_path.read_bytes().splitlines() if line.strip()]
    launches = [event for event in events if event.get("type") == "learner_launch"]
    if len(launches) != 1:
        raise ValueError("legacy continuation event stream is missing or ambiguous")
    launch = launches[0]
    command = launch.get("command", [])
    command_sha = digest(json.dumps([command[0], command[1:], str(tree)],
                                   ensure_ascii=False, separators=(",", ":")).encode()) if command else ""
    if (launch.get("engine") != "codex" or launch.get("task") != "fix-batch"
            or launch.get("cwd") != str(tree) or launch.get("params", {}).get("scratch") != str(scratch)
            or len(command) < 4 or command[1:3] != ["exec", "resume"] or command[-2:] != [thread, "-"]
            or request not in launch.get("prompt", "") or frozen["sha256"] not in launch.get("prompt", "")):
        raise ValueError("legacy continuation original launch or frozen input mismatch")
    attempts = [event for event in events if event.get("type") == "learner_startup_attempt"
                and event.get("batch") == batch_id and event.get("command_sha256") == command_sha
                and re.fullmatch(r"[0-9a-f]{64}", event.get("input_sha256", ""))]
    acks = [event for event in events if event.get("type") == "learner_resume_ack"
            and event.get("batch") == batch_id and event.get("thread_id") == thread
            and event.get("command_sha256") == command_sha
            and re.fullmatch(r"[0-9a-f]{64}", event.get("first_message_sha256", ""))
            and any(event.get("input_sha256") == attempt["input_sha256"] for attempt in attempts)]
    if not acks or not any(event.get("type") == "thread.started" and event.get("thread_id") == thread for event in events):
        raise ValueError("legacy continuation lacks an authenticated same-thread input consumption receipt")
    return None


def contains_original(original, sent):
    """Permit complete JSON pretty-printing, while retaining every original key and value."""
    if original and original in sent:
        return True
    try:
        value = json.loads(original)
        if not isinstance(value, (dict, list)) or not value:
            return False
        text = sent.decode("utf8")
        for match in re.finditer(r"(?m)^[ \t]*[\[{]", text):
            try:
                candidate, _ = json.JSONDecoder().raw_decode(text[match.start():].lstrip())
                if canonical(candidate) == canonical(value):
                    return True
            except ValueError:
                continue
    except (ValueError, UnicodeError):
        pass
    return False


def ack_feature(root, state, notice, payload):
    """Verify an existing feature's original batch, thread and words without creating a parent."""
    source = json.loads(artifact(root, notice["source_evidence"]))
    batch_id = notice.get("source_batch", "")
    batch = state.get("batches", {}).get(batch_id, {})
    from learner_jobs import FEATURE_REQUESTS
    character = batch.get("character")
    if (not re.fullmatch(r"\d{8}-\d{6}-fix-batch", batch_id)
            or batch.get("task") != "fix-batch" or batch.get("learner_task") not in FEATURE_REQUESTS
            or not batch.get("feature_request") or batch["feature_request"] != notice.get("request_id")
            or source.get("feature_request") != batch["feature_request"] or source.get("batch") != batch_id
            or not character or source.get("character") != character or notice.get("character") != character
            or payload.get("character", character) != character or source.get("worktree") != batch.get("worktree")
            or not UUID.fullmatch(source.get("thread_id", ""))):
        raise ValueError("feature notice must match its registered batch, character and original thread")
    tree = Path(batch["worktree"]).resolve()
    if tree.parent != (Path(root) / ".worktrees").resolve():
        raise ValueError("feature worktree outside project")
    report_path = batch.get("report", {}).get("report")
    if not isinstance(report_path, str):
        raise ValueError("feature original scratch is not registered")
    scratch = (Path(root) / report_path).resolve().parent
    log_path = (Path(root) / source["original_log"]["path"]).resolve()
    root_scratch = scratch.parent == (Path(root) / "learner/runs").resolve()
    if ((scratch.parent != tree / "learner/runs" and not root_scratch)
            or log_path != scratch.with_suffix(".jsonl")):
        raise ValueError("feature original log outside registered worktree")
    events = [json.loads(line) for line in artifact(root, source["original_log"]).splitlines() if line.strip()]
    launch = next((event for event in events if event.get("type") == "learner_launch"), {})
    threads = {event.get("thread_id") for event in events if event.get("type") == "thread.started"}
    if (launch.get("engine") != "codex" or launch.get("cwd") != str(tree)
            or launch.get("task") != batch["learner_task"] or source["thread_id"] not in threads):
        raise ValueError("feature original launch/thread mismatch")
    # Root event logs are shared by jobs; bind them to the launcher's original scratch and owner.
    if root_scratch:
        params = launch.get("params")
        if (not isinstance(params, dict) or not isinstance(params.get("scratch"), str)
                or (Path(root) / params["scratch"]).resolve() != scratch
                or params.get("worktree") != str(tree) or params.get("character") != character):
            raise ValueError("feature root event log does not match registered launch scratch/owner")
    message_path = (Path(root) / source["original_message"]["path"]).resolve()
    if not message_path.is_relative_to(scratch):
        raise ValueError("feature original message outside bound scratch")
    original = artifact(root, source["original_message"])
    if (not isinstance(notice.get("message"), str) or original != notice["message"].encode("utf8")
            or digest(original) != notice.get("request_sha256")):
        raise ValueError("feature original message SHA mismatch")
    token = digest(canonical([notice["request_sha256"], notice["kind"], notice["message"]]))[:24]
    if source.get("native_delivery"):
        delivery = source["native_delivery"]
        receipt = json.loads(artifact(root, delivery["receipt"]))
        evidence = json.loads(artifact(root, receipt["evidence"]))
        sent = artifact(root, delivery["message"])
        response = evidence.get("transport_response", {}).get("result", {})
        if (receipt.get("notice_id") != notice.get("id") or receipt.get("stage") != "ops_forwarded"
                or receipt.get("actor") != "ops" or receipt.get("status") != "delivered"
                or evidence.get("notice_id") != notice.get("id")
                or evidence.get("source_feature_request") != batch["feature_request"]
                or evidence.get("source_batch") != batch_id or evidence.get("transport_exit") != 0
                or response.get("type") != "agent_prompted" or not evidence.get("target_pane")
                or response.get("agent", {}).get("pane_id") != evidence["target_pane"]
                or digest(sent) != evidence.get("message_sha256") or not contains_original(original, sent)
                or (notice.get("ops_forwarded") and
                    artifact(root, notice["ops_forwarded"]) != artifact(root, delivery["receipt"]))
                or (payload.get("stage") == "ops_forwarded" and payload != receipt)):
            raise ValueError("feature native delivery identity, original words or receipt mismatch")
    elif notice.get("id") != token:
        raise ValueError("feature notice identity or frozen content mismatch")
    return None


def ack_boss_sim(root, state, notice, payload):
    """Bind a B4/B5 notice to its existing evidence and independently observed native text."""
    source = json.loads(artifact(root, notice["source_evidence"]))
    batch_id = notice.get("source_batch", "")
    batch = state.get("batches", {}).get(batch_id, {})
    evidence = batch.get("boss_sim", {})
    key = evidence.get("key", "")
    if (not re.fullmatch(r"\d{8}-\d{6}-fix-batch", batch_id) or batch.get("task") != "fix-batch"
            or batch.get("learner_task") != "boss-sim-batch" or batch.get("feature_request")
            or not re.fullmatch(r"[0-9a-f]{64}", key) or batch.get("key") != key
            or source.get("evidence_key") != key or notice.get("request_id") != key
            or evidence.get("mode") not in ("b4", "b5") or source.get("batch") != batch_id
            or not batch.get("character") or evidence.get("character") != batch["character"]
            or source.get("character") != batch["character"] or notice.get("character") != batch["character"]
            or payload.get("character", batch["character"]) != batch["character"]
            or source.get("worktree") != batch.get("worktree") or not UUID.fullmatch(source.get("thread_id", ""))):
        raise ValueError("boss simulation notice must match its original batch, character and evidence key")
    tree = Path(batch["worktree"]).resolve()
    log = (Path(root) / source["original_log"]["path"]).resolve()
    scratch = log.with_suffix("")
    report = (Path(root) / source["original_report"]["path"]).resolve()
    frozen = (Path(root) / source["boss_evidence"]["path"]).resolve()
    if (tree.parent != (Path(root) / ".worktrees").resolve() or log.parent != tree / "learner/runs"
            or log.suffix != ".jsonl" or report != scratch / "report.md"
            or frozen != Path(batch["evidence_path"]).resolve()
            or canonical(json.loads(artifact(root, source["boss_evidence"]))) != canonical(evidence)):
        raise ValueError("boss simulation notice frozen input or scratch mismatch")
    events = [json.loads(line) for line in artifact(root, source["original_log"]).splitlines() if line.strip()]
    launch = next((event for event in events if event.get("type") == "learner_launch"), {})
    threads = {event.get("thread_id") for event in events if event.get("type") == "thread.started"}
    if (launch.get("engine") != "codex" or launch.get("cwd") != str(tree)
            or launch.get("task") != "boss-sim-batch" or source["thread_id"] not in threads):
        raise ValueError("boss simulation original launch/thread mismatch")
    original_report = artifact(root, source["original_report"])
    delivery = source["native_delivery"]
    sent = artifact(root, delivery["message"])
    receipt = json.loads(artifact(root, delivery["receipt"]))
    response = json.loads(artifact(root, receipt["evidence"])).get("result", {})
    received = json.loads(artifact(root, delivery["received"]))
    if (receipt.get("delivery_token") != notice.get("id") or receipt.get("stage") != "ops_forwarded"
            or receipt.get("actor") != "ops" or receipt.get("status") != "delivered"
            or receipt.get("original_batch") != batch_id or response.get("type") != "agent_prompted"
            or not response.get("agent", {}).get("pane_id")
            or received.get("notice_id") != notice.get("id") or received.get("original_batch") != batch_id
            or received.get("stage") != "watcher_received" or received.get("actor") != "watcher"
            or received.get("status") != "delivered" or artifact(root, received["evidence"]) != sent
            or digest(original_report).encode() not in sent or key.encode() not in sent or batch_id.encode() not in sent
            or sent != notice.get("message", "").encode("utf8") or digest(sent) != notice.get("request_sha256")
            or (payload.get("stage") == "ops_forwarded" and payload != receipt)
            or (notice.get("ops_forwarded") and
                artifact(root, notice["ops_forwarded"]) != artifact(root, delivery["receipt"]))):
        raise ValueError("boss simulation native delivery, original report or independent receipt mismatch")
    return None


def register_feature_notice(root, state_dir, state, source_path, notice_id, kind):
    """Bind the producer's frozen provenance and existing delivery ID; do not send or ACK."""
    path = (Path(root) / source_path).resolve()
    source_ref = {"path": str(path), "sha256": digest(path.read_bytes())}
    source = json.loads(artifact(root, source_ref))
    source_kind = source.get("source_kind", "feature")
    original = artifact(root, source["native_delivery"]["message"] if source_kind == "boss-sim"
                        else source["original_message"])
    request_id = source["evidence_key"] if source_kind == "boss-sim" else source["feature_request"]
    notice = {"id": notice_id, "kind": kind, "request_id": request_id,
              "request_sha256": digest(original), "message": original.decode("utf8"),
              "notification_only": True, "registered_learning_request": False, "source_kind": source_kind,
              "character": source["character"], "source_batch": source["batch"], "source_evidence": source_ref,
              "ops_forwarded": False, "watcher_received": False, "roy_notified": False}
    if not re.fullmatch(r"[0-9a-f]{24}", notice_id):
        raise ValueError("invalid feature notice ID")
    ack_request(root, state, notice, {"notice_id": notice_id, "character": source["character"]})
    frozen_source = Path(state_dir) / "learning-notices/sources" / (notice_id + ".json")
    frozen_raw = (json.dumps(source, ensure_ascii=False, indent=2) + "\n").encode("utf8")
    notice["source_evidence"] = {"path": str(frozen_source), "sha256": digest(frozen_raw)}
    if frozen_source.exists() and frozen_source.read_bytes() != frozen_raw:
        raise ValueError("existing feature notice has a different frozen source")
    destination = Path(state_dir) / "learning-notices" / (notice_id + ".json")
    if destination.exists():
        existing = json.loads(destination.read_bytes())
        identity = set(notice) - {"ops_forwarded", "watcher_received", "roy_notified"}
        if any(existing.get(key) != notice[key] for key in identity):
            raise ValueError("existing feature notice has a different frozen source")
        if not frozen_source.exists():
            atomic(frozen_source, source)
        return notice_id
    atomic(frozen_source, source)
    atomic(destination, notice)
    return notice_id


def read_request(root, path):
    raw = Path(path).read_bytes()
    req = json.loads(raw)
    if (req.get("schema") != "learning-request-v1" or req.get("authorized_by") != "Roy"
            or req.get("goal") != "experience-live" or not ID.fullmatch(req.get("id", ""))
            or Path(path).name != req["id"] + ".json"
            or not re.fullmatch(r"[a-z][a-z0-9_]*", req.get("character", ""))
            or type(req.get("revision")) is not int or req["revision"] < 1
            or not UUID.fullmatch(req.get("thread_id", ""))):
        raise ValueError("invalid learning request identity")
    required = req.get("requirements")
    if (not isinstance(required, list) or not required or len(set(required)) != len(required)
            or any(not isinstance(key, str) or not ID.fullmatch(key) for key in required)):
        raise ValueError("invalid acceptance requirements")
    artifact(root, req["input"])
    tree = (Path(root) / req["worktree"]).resolve()
    if tree.parent != (Path(root) / ".worktrees").resolve() or not (tree / ".git").is_file():
        raise ValueError("original worktree missing or outside worktrees")
    # A user-supplied thread string alone must not authorize resuming another job.
    original = artifact(root, req["original_log"])
    events = [json.loads(line) for line in original.splitlines() if line.strip()]
    launch = next((e for e in events if e.get("type") == "learner_launch"), {})
    threads = {e.get("thread_id") for e in events if e.get("type") == "thread.started"}
    if (req["thread_id"] not in threads or launch.get("engine") != "codex"
            or launch.get("cwd") != str(tree)):
        raise ValueError("original thread/worktree provenance mismatch")
    return req, raw


def notify(root, state_dir, record, kind, message):
    """A durable outbox plus an ops event; delivery ACK is a separate fact."""
    token = digest(canonical([record.get("request_sha256"), kind, message]))[:24]
    notice = Path(state_dir) / "learning-notices" / (token + ".json")
    if not notice.exists():
        atomic(notice, {"id": token, "kind": kind, "request_id": record["id"], "message": message,
                        "request_sha256": record.get("request_sha256"),
                        "created_at": time.time(), "route": ["learner", "ops", "watcher", "Roy"],
                        "ops_forwarded": False, "watcher_received": False, "roy_notified": False})
    data = json.loads(notice.read_text())
    if not data.get("ops_forwarded"):
        # Relay the learner's exact words without waiting for a busy ops model.
        # The inbox is the existing watcher channel; reading and informing Roy
        # remain separate acknowledgements. The marker makes crash recovery safe.
        marker = f"<!-- learning-notice:{token} -->"
        line = (f"\n- {dt.datetime.now().isoformat()} [ops学习通知/{kind}] {record['id']}："
                f"{message} 回执{notice}；watcher须读取并告知Roy，尚未确认用户收到。{marker}\n")
        delivered = []
        for relative in ("ops/inbox-dev.md", "notes/for-roy.md"):
            destination = Path(root) / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            if not destination.exists() or marker not in destination.read_text():
                with destination.open("a") as handle:
                    handle.write(line)
            delivered.append(relative)
        evidence = Path(state_dir) / "learning-notices/receipts" / (token + ".inbox.json")
        atomic(evidence, {"notice_id": token, "sender": "ops-learning-scheduler",
                          "channel": "existing-watcher-inbox", "destinations": delivered,
                          "marker": marker, "text": line})
        receipt = evidence.with_name(token + ".ops-forwarded.json")
        atomic(receipt, {"notice_id": token, "stage": "ops_forwarded", "actor": "ops", "status": "delivered",
                         "evidence": {"path": str(evidence), "sha256": digest(evidence.read_bytes())}})
        data["ops_forwarded"] = {"path": str(receipt), "sha256": digest(receipt.read_bytes()), "at": time.time()}
        atomic(notice, data)
    text = (f"学习要求 {record['id']}：{message}\n通知回执：{notice}\n"
            "处理协议及回执格式：docs/learning-requests.md。\n"
            "Roy明确要求：ops须把问题原文、证据、与旧知识的差异及下一步交给watcher，由watcher告知Roy。"
            "程序已将原文写入ops/inbox-dev.md和notes/for-roy.md作为ops转达；请处理问题并在可用时提醒现有watcher会话；"
            "无法转达必须保留pending并报告阻塞。不要仅归档事件便称用户已知。"
            "用 python3 ops/learning_requests.py ack --notice <id> --stage ops_forwarded|watcher_received|roy_notified "
            "--receipt <项目内真实发送/接收回执文件> 分角色登记；queued不是已送达。\n")
    # The persistent notice survives queue consumption and is retried until ACK.
    data = json.loads(notice.read_text())
    if data.get("roy_notified"):
        return token
    queue = Path(state_dir) / "queue"
    queue.mkdir(parents=True, exist_ok=True)
    last = data.get("last_queued_at", 0)
    if time.time() - last >= 1800 or not last:
        event = queue / f"{time.time_ns()}-learning-attention.md"
        event.write_text(text)
        data.update(last_queued_at=time.time(), last_queue=str(event))
        atomic(notice, data)
    return token


def reconcile(state, root, scripts, character, alive, stamp, start, limit=2):
    """Called under the existing learn.lock at every learning tick/completion."""
    state_dir = Path(os.environ.get("CODEX_OPS_DIR") or Path(root) / "ops/codex-ops")
    goals = state.get("learning_requests", {})
    for notice in (state_dir / "learning-notices").glob("*.json"):
        value = json.loads(notice.read_bytes())
        if not value.get("roy_notified"):
            if value.get("source_kind") in ("feature", "boss-sim", "legacy-continuation"):
                # Preserve the native delivery ID and independent ACKs; never resend as a parent notice.
                if time.time() - value.get("last_queued_at", 0) >= 1800:
                    queue = state_dir / "queue"
                    queue.mkdir(parents=True, exist_ok=True)
                    event = queue / f"{time.time_ns()}-learning-attention.md"
                    event.write_text(f"原feature通知 {value['id']}：{value['message']}\n"
                                     f"来源与回执：{notice}。按 docs/learning-requests.md 分角色登记真实回执；"
                                     "queued不代表发送、接收或Roy已知。\n")
                    value.update(last_queued_at=time.time(), last_queue=str(event))
                    atomic(notice, value)
            else:
                notify(root, state_dir, {"id": value["request_id"], "request_sha256": value.get("request_sha256")},
                       value["kind"], value["message"])
    for path in sorted((Path(root) / "notes/learning-requests").glob("*.json")):
        if not ID.fullmatch(path.stem):
            continue
        state.setdefault("learning_requests", goals)
        rec = goals.setdefault(path.stem, {"id": path.stem, "state": "pending", "attempts": [], "pending_since": time.time()})
        try:
            req, raw = read_request(root, path)
            if req["character"] != character:
                continue
            current_sha = digest(raw)
            old_sha = rec.get("request_sha256")
            if old_sha != current_sha:
                if old_sha and req["revision"] <= rec.get("revision", 0):
                    raise ValueError("changed input requires a new revision")
                rec.update(request_sha256=current_sha, revision=req["revision"], request_path=str(path))
                if rec.get("state") != "running":
                    rec.update(state="pending", pending_since=time.time())
            active = state["batches"].get(rec.get("batch"), {})
            if rec["state"] == "running":
                if active.get("state") == "running" and alive(active.get("pid")):
                    continue
                rec.update(state="blocked", reason="学习进程退出但缺完成回执；保留原现场，ops须核查后沿同thread续办")
            if rec["state"] in ("blocked", "questioned", "awaiting_delivery"):
                notify(root, state_dir, rec, rec["state"], rec.get("reason", "未完成验收"))
                continue
            if rec["state"] == "completed" or time.time() < rec.get("retry_at", 0):
                continue
            if time.time() - rec.get("pending_since", time.time()) >= 1800:
                notify(root, state_dir, rec, "pending-stalled", "原学习要求等待可用策略槽/owner释放已超过30分钟；ops须核对归属与可执行下一步，不能仅登记后遗忘")
            prior = state["batches"].get(req["original_batch"], {})
            tree = str((Path(root) / req["worktree"]).resolve())
            if prior.get("worktree") != tree or prior.get("character") != character:
                raise ValueError("original batch registration mismatch")
            if prior.get("state") not in ("done", "failed") or alive(prior.get("pid")):
                continue
            if any(b.get("worktree") == tree and b.get("state") == "running" and alive(b.get("pid"))
                   for b in state["batches"].values()):
                continue
            occupied = sum(b.get("task") == "strategy-proposal" and b.get("state") == "running"
                           and alive(b.get("pid")) for b in state["batches"].values())
            if occupied >= limit:
                continue
            from learner_jobs import external_writer
            if external_writer(tree):
                continue
            # Keep existing finish/recheck/broker batch syntax; identity lives in
            # learning_request, not a new type that legacy tools cannot inspect.
            batch_id = stamp + "-strategy-proposal"
            if batch_id in state["batches"]:
                continue
            snapshot = state_dir / "learner" / (batch_id + ".learning-input.json")
            atomic(snapshot, req)
            pid, pane = start(["nice", "-n", "19", "python3", str(Path(scripts) / "learning_requests.py"),
                               "run", "--batch", batch_id], root, scripts, str(state_dir), "learner-" + batch_id)
            state["batches"][batch_id] = {
                "task": "strategy-proposal", "character": character, "runs": prior.get("runs", []),
                "key": "learning:" + req["id"], "state": "running", "pid": pid, "pane": pane,
                "worktree": tree, "learning_request": req["id"], "learning_revision": req["revision"],
                "learning_input": str(snapshot), "learning_input_sha256": digest(snapshot.read_bytes()),
                "learning_request_sha256": current_sha, "proposal_policy": "Roy-2026-10-07-learning"}
            rec.update(state="running", batch=batch_id, started_at=time.time())
            rec["attempts"].append(batch_id)
            return batch_id, pid
        except (OSError, ValueError, KeyError, TypeError) as error:
            rec.update(state="blocked", reason=str(error))
            notify(root, state_dir, rec, "blocked", str(error))
    return None


def verify_experience(root, req, report):
    """Verify the actual live bytes and source ancestry, never a 'done' boolean."""
    result = report.get("learning_result", {})
    if (result.get("request_id") != req["id"] or result.get("revision") != req["revision"]
            or result.get("input_sha256") != req["input"]["sha256"]):
        raise ValueError("learning result did not acknowledge exact request revision/input")
    if result.get("outcome") not in ("complete", "continue", "questioned", "blocked"):
        raise ValueError("missing explicit learning outcome")
    if result["outcome"] != "complete":
        return result
    commit = report.get("merged")
    if not isinstance(commit, str) or not re.fullmatch(r"[0-9a-f]{40}", commit):
        raise ValueError("missing actual live source commit")
    live = Path(os.environ.get("STS2_LIVE", str(Path(root) / ".worktrees/live")))
    if subprocess.run(["git", "-C", str(live), "merge-base", "--is-ancestor", commit, "HEAD"],
                      capture_output=True).returncode:
        raise ValueError("source is not in live")
    exp = json.loads((live / "knowledge/characters" / req["character"] / "experience.json").read_bytes())
    entries = {e["id"]: e for e in exp["entries"]}
    coverage = result.get("coverage", {})
    if set(coverage) != set(req["requirements"]):
        raise ValueError("learning requirements not fully covered")
    for key, refs in coverage.items():
        if not isinstance(refs, list) or not refs:
            raise ValueError("no experience references for " + key)
        for ref in refs:
            entry = entries.get(ref.get("id"), {})
            if (entry.get("status") != "active" or not entry.get("evidence")
                    or digest(canonical(entry)) != ref.get("sha256")):
                raise ValueError("live experience entry/evidence/hash mismatch")
    receipt = json.loads(artifact(root, result["consumer_receipt"]))
    if (receipt.get("request_id") != req["id"] or receipt.get("revision") != req["revision"]
            or receipt.get("character") != req["character"] or receipt.get("status") != "passed"
            or receipt.get("experience_version") != exp["version"]
            or receipt.get("kind") not in ("fixed-consumer", "natural-consumer")):
        raise ValueError("consumer readback missing or mismatched")
    # A handwritten passed flag is not a readback: preserve the actual probe
    # input/output bytes so ops can independently inspect them.
    probe = receipt.get("evidence")
    if not isinstance(probe, list) or not probe:
        raise ValueError("consumer readback has no evidence artifacts")
    for evidence in probe:
        artifact(root, evidence)
    return result


def finish(state, root, state_dir, batch_id, rc, report):
    batch = state["batches"][batch_id]
    rec = state["learning_requests"][batch["learning_request"]]
    req = json.loads(artifact(root, {"path": batch["learning_input"], "sha256": batch["learning_input_sha256"]}))
    batch.update(finished=dt.datetime.now().isoformat(), rc=rc, report=report)
    try:
        # A supplement can arrive after the last scheduler tick but before this
        # process exits. Re-read admission before allowing the older result to close it.
        current_req, current_raw = read_request(root, rec["request_path"])
        if digest(current_raw) != rec["request_sha256"]:
            if current_req["revision"] <= rec["revision"]:
                raise ValueError("changed input requires a new revision")
            rec.update(request_sha256=digest(current_raw), revision=current_req["revision"])
        if rc:
            raise ValueError(f"学习者exit {rc}；沿原thread核查恢复，保留原失败")
        result = verify_experience(root, req, report)
        if result["outcome"] == "complete":
            from learner_checks import proposal_tools
            errors = proposal_tools().links(report, batch, str(root), str(Path(root) / "ops"))
            if errors:
                raise ValueError("learning proposal chain incomplete: " + "; ".join(errors))
        questions = result.get("questions", [])
        for q in questions:
            if not all(q.get(k) for k in ("claim", "finding", "evidence", "recommendation")):
                raise ValueError("incomplete learning disagreement record")
        batch["state"] = "done"
        batch["learning_result"] = result
        if rec["request_sha256"] != batch["learning_request_sha256"]:
            rec.update(state="pending", pending_since=time.time(), reason="旧revision已返回，继续新补充；旧结果不关闭新要求")
        elif result["outcome"] == "continue":
            checkpoint = result.get("checkpoint")
            if not isinstance(checkpoint, str) or not checkpoint.strip():
                raise ValueError("continue requires a concrete progress checkpoint")
            if checkpoint == rec.get("checkpoint"):
                raise ValueError("连续两批无新增进度，需要ops/watcher处理阻塞")
            rec.update(state="pending", pending_since=time.time(), checkpoint=checkpoint, retry_at=time.time() + 60)
        elif result["outcome"] == "complete":
            batch["merged"] = report["merged"]
            rec.update(state="awaiting_delivery", reason=f"经验已核live及消费者读取，待ops→watcher→Roy交付回执；ops核批{batch_id}的源码测试/提案/版本台账并沿learner-recheck补宿主检查", verified_batch=batch_id)
        else:
            rec.update(state=result["outcome"], reason=result.get("reason") or "学习结论存在争议/缺证，须报告Roy")
        if questions:
            rec["questions"] = questions
            rec.setdefault("notices", []).append(notify(root, state_dir, rec, "disagreement", json.dumps(questions, ensure_ascii=False)))
        if rec["state"] != "pending":
            rec.setdefault("notices", []).append(notify(root, state_dir, rec, rec["state"], rec["reason"]))
    except (OSError, ValueError, KeyError, TypeError) as error:
        batch["state"] = "failed"
        rec.update(state="blocked", reason=str(error))
        rec.setdefault("notices", []).append(notify(root, state_dir, rec, "blocked", str(error)))


@contextmanager
def locked(state_dir):
    with (Path(state_dir) / "learn.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        state = json.loads((Path(state_dir) / "learn.json").read_bytes())
        yield state
        atomic(Path(state_dir) / "learn.json", state)


def run(root, state_dir, batch_id):
    """Host wrapper; the child still uses the original learner permission profile."""
    with locked(state_dir) as state:
        batch = state["batches"][batch_id]
        if batch.get("state") != "running" or not batch.get("learning_request"):
            raise ValueError("continuation no longer owns registration")
        req = json.loads(artifact(root, {"path": batch["learning_input"], "sha256": batch["learning_input_sha256"]}))
        rec = state["learning_requests"][req["id"]]
        checkpoint = rec.get("checkpoint", "初次接续，复用原报告并补剩余验收。")
    tree = Path(batch["worktree"])
    # The original owner lease is held through the entire resumed process.
    with (Path(state_dir) / "learner" / (tree.name + ".lock")).open("a") as lease:
        fcntl.flock(lease, fcntl.LOCK_EX | fcntl.LOCK_NB)
        home = (Path(state_dir) / "codex-home").read_text().strip()
        if home != req["learner_home"]:
            raise ValueError("learner account changed; explicit original-thread recovery required")
        payload = artifact(root, req["input"]).decode()
        template = (Path(root) / "learner/tasks/learning-followup.md").read_text()
        prompt = template.replace("LEARNING_REQUEST_JSON", json.dumps(req, ensure_ascii=False, indent=2))
        prompt = prompt.replace("LEARNING_INPUT_TEXT", payload).replace("LEARNING_CHECKPOINT", checkpoint)
        taskfile = Path(state_dir) / "learner" / (batch_id + ".task.md")
        taskfile.write_text(prompt)
        env = dict(os.environ)
        env.update(LEARNER_CODEX_HOME=home, STS2_WORKSPACE=str(root), LEARNER_BATCH_ID=batch_id,
                   LEARNER_STATE_FILE=str(Path(state_dir) / "learn.json"),
                   LEARNER_CODEX_BIN=str(Path(root) / "ops/codex-learner.sh"))
        out = Path(state_dir) / "learner" / (batch_id + ".out")
        err = Path(state_dir) / "learner" / (batch_id + ".err")
        argv = [str(Path(root) / "agent/node_modules/.bin/tsx"), str(Path(root) / "learner/run.ts"),
                "--engine", "codex", "--task", str(taskfile), "--character", req["character"],
                "--cwd", str(tree), "--resume-thread", req["thread_id"]]
        with out.open("x") as stdout, err.open("x") as stderr:
            rc = subprocess.run(argv, cwd=root, env=env, stdout=stdout, stderr=stderr).returncode
        from learner_checks import read_report
        report = read_report(str(out))
        acknowledgement = None
        match = re.search(r"日志 (\S+\.jsonl)", err.read_text())
        if match:
            event_path = Path(match[1]).resolve()
            if event_path.is_relative_to(Path(root).resolve()):
                with event_path.open() as events:
                    for line in events:
                        event = json.loads(line)
                        if (event.get("type") == "learner_resume_ack" and event.get("thread_id") == req["thread_id"]
                                and event.get("batch") == batch_id):
                            acknowledgement = {"event_log": str(event_path), **event}
                            break
        with locked(state_dir) as state:
            current = state["batches"][batch_id]
            current["consumed"] = acknowledgement is not None
            current["consumption_receipt"] = acknowledgement
            if rc == 0 and acknowledgement is None:
                rc = 1
                current["consumption_error"] = "missing same-thread first real model reply receipt"
            finish(state, root, state_dir, batch_id, rc, report)
    return rc


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("run", "ack", "retry", "register-feature"))
    parser.add_argument("--batch")
    parser.add_argument("--notice")
    parser.add_argument("--stage", choices=("ops_forwarded", "watcher_received", "roy_notified"))
    parser.add_argument("--request")
    parser.add_argument("--receipt")
    parser.add_argument("--source")
    parser.add_argument("--kind", choices=("disagreement", "blocked"), default="disagreement")
    args = parser.parse_args()
    root = Path(os.environ.get("CODEX_OPS_ROOT") or Path(__file__).resolve().parent.parent)
    state_dir = Path(os.environ.get("CODEX_OPS_DIR") or root / "ops/codex-ops")
    if args.action == "register-feature":
        if not args.source or not args.notice:
            parser.error("feature source and original notice ID required")
        try:
            with locked(state_dir) as state:
                ident = register_feature_notice(root, state_dir, state, args.source, args.notice, args.kind)
        except (ValueError, KeyError, TypeError, OSError, ImportError) as error:
            parser.error(str(error))
        print(ident)
        return 0
    if args.action == "run":
        try:
            return run(root, state_dir, args.batch)
        except Exception as error:
            with locked(state_dir) as state:
                batch = state["batches"].get(args.batch, {})
                if batch.get("learning_request"):
                    batch.update(state="failed", error=str(error))
                    rec = state["learning_requests"][batch["learning_request"]]
                    rec.update(state="blocked", reason=str(error))
                    notify(root, state_dir, rec, "blocked", str(error))
            raise
        finally:
            if os.environ.get("CODEX_OPS_NO_DRAIN") != "1":
                subprocess.Popen(["bash", str(root / "ops/codex-ops.sh"), "drain"], cwd=root,
                                 stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                                 stderr=subprocess.DEVNULL, start_new_session=True)
    if not args.receipt:
        parser.error("a real receipt is required")
    receipt = (root / args.receipt).resolve()
    if not receipt.is_relative_to(root.resolve()) or not receipt.is_file():
        parser.error("receipt must be an existing project file")
    proof = {"path": str(receipt), "sha256": digest(receipt.read_bytes()), "at": time.time()}
    with locked(state_dir) as state:
        if args.action == "retry":
            rec = state["learning_requests"][args.request]
            if rec["state"] not in ("blocked", "questioned"):
                parser.error("only a stopped incomplete request can be resumed")
            rec.update(state="pending", pending_since=time.time(), retry_receipt=proof, retry_at=0)
        else:
            if not args.notice or not re.fullmatch(r"[0-9a-f]{24}", args.notice) or not args.stage:
                parser.error("notice and stage required")
            path = state_dir / "learning-notices" / (args.notice + ".json")
            notice = json.loads(path.read_bytes())
            payload = json.loads(receipt.read_bytes())
            actor = "ops" if args.stage == "ops_forwarded" else "watcher"
            payload_id = payload.get("notice_id")
            if notice.get("source_kind") == "boss-sim" and args.stage == "ops_forwarded":
                payload_id = payload_id or payload.get("delivery_token")
            if (payload_id != args.notice or payload.get("stage") != args.stage
                    or payload.get("actor") != actor or payload.get("status") != "delivered"):
                parser.error("receipt must identify the notice, delivery stage, responsible actor and delivered status")
            artifact(root, payload["evidence"])
            previous = {"watcher_received": "ops_forwarded", "roy_notified": "watcher_received"}.get(args.stage)
            if previous and not notice.get(previous):
                parser.error("previous delivery stage has no receipt")
            try:
                rec = ack_request(root, state, notice, payload)
                # A truthy pointer is not a verified delivery. Recheck the entire preceding chain.
                stages = ("ops_forwarded", "watcher_received", "roy_notified")
                for stage in stages[:stages.index(args.stage)]:
                    prior = json.loads(artifact(root, notice[stage]))
                    prior_actor = "ops" if stage == "ops_forwarded" else "watcher"
                    prior_id = prior.get("notice_id")
                    if notice.get("source_kind") == "boss-sim" and stage == "ops_forwarded":
                        prior_id = prior_id or prior.get("delivery_token")
                    if (prior_id != args.notice or prior.get("stage") != stage
                            or prior.get("actor") != prior_actor or prior.get("status") != "delivered"):
                        raise ValueError("previous delivery receipt identity mismatch")
                    artifact(root, prior["evidence"])
                # Read completion dependencies before persisting the current stage, so rejection is atomic.
                complete = rec is not None and rec["state"] == "awaiting_delivery" and all(
                    (args.stage == "roy_notified" or notice.get("roy_notified")) if ident == args.notice else
                    json.loads((state_dir / "learning-notices" / (ident + ".json")).read_bytes()).get("roy_notified")
                    for ident in set(rec.get("notices", [])))
            except (ValueError, KeyError, TypeError, OSError, ImportError) as error:
                parser.error(str(error))
            notice[args.stage] = proof
            atomic(path, notice)
            if complete:
                rec["state"] = "completed"
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
