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
    text = (f"学习要求 {record['id']}：{message}\n通知回执：{notice}\n"
            "处理协议及回执格式：docs/learning-requests.md。\n"
            "Roy明确要求：ops须把问题原文、证据、与旧知识的差异及下一步交给watcher，由watcher告知Roy。"
            "先在ops/inbox-dev.md和notes/for-roy.md追加，再向现有watcher会话转达；"
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
    live = Path(root) / ".worktrees/live"
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
    parser.add_argument("action", choices=("run", "ack", "retry"))
    parser.add_argument("--batch")
    parser.add_argument("--notice")
    parser.add_argument("--stage", choices=("ops_forwarded", "watcher_received", "roy_notified"))
    parser.add_argument("--request")
    parser.add_argument("--receipt")
    args = parser.parse_args()
    root = Path(os.environ.get("CODEX_OPS_ROOT") or Path(__file__).resolve().parent.parent)
    state_dir = Path(os.environ.get("CODEX_OPS_DIR") or root / "ops/codex-ops")
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
            if (payload.get("notice_id") != args.notice or payload.get("stage") != args.stage
                    or payload.get("actor") != actor or payload.get("status") != "delivered"):
                parser.error("receipt must identify the notice, delivery stage, responsible actor and delivered status")
            artifact(root, payload["evidence"])
            previous = {"watcher_received": "ops_forwarded", "roy_notified": "watcher_received"}.get(args.stage)
            if previous and not notice.get(previous):
                parser.error("previous delivery stage has no receipt")
            notice[args.stage] = proof
            atomic(path, notice)
            rec = state["learning_requests"][notice["request_id"]]
            if rec["state"] == "awaiting_delivery" and all(
                    json.loads((state_dir / "learning-notices" / (ident + ".json")).read_bytes()).get("roy_notified")
                    for ident in set(rec.get("notices", []))):
                rec["state"] = "completed"
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
