"""Frozen historical inputs and verified report completion for the core-build study."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time

TASK = "silent-historical-core-builds"
REQUEST = "roy-20261009-historical-core-builds"
REQUEST_FILE = "notes/silent-historical-core-builds-dispatch.json"
SECTIONS = ("candidate_builds", "boss_matrix", "damage_survival", "construction_templates", "limitations")


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def atomic_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + f".{os.getpid()}.tmp")
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    os.replace(tmp, path)


def pending_request(root):
    try:
        request = json.loads(Path(root, REQUEST_FILE).read_text())
    except (OSError, ValueError):
        return None
    if (request.get("request_id") == REQUEST and request.get("task") == TASK
            and request.get("character") == "silent" and request.get("authorized_by") == "Roy"
            and request.get("state") == "pending"):
        return request
    return None


def update_request(root, **fields):
    import fcntl
    path = Path(root, REQUEST_FILE)
    history = Path(root, "ops/codex-ops/core-request-history")
    history.mkdir(parents=True, exist_ok=True)
    with (history / "request.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        raw = path.read_bytes()
        value = json.loads(raw)
        if value.get("request_id") != REQUEST:
            raise ValueError("core-build request identity changed")
        before = hashlib.sha256(raw).hexdigest()
        original = history / (before + ".json")
        if not original.exists():
            original.write_bytes(raw)
        value.update(fields)
        atomic_json(path, value)
        with (history / "changes.jsonl").open("a") as handle:
            handle.write(json.dumps({"at": time.time(), "request_id": REQUEST, "before_sha256": before,
                                     "after_sha256": digest(path), "fields": fields}, ensure_ascii=False) + "\n")


def complete_cut(path):
    """Exclude an in-flight JSONL line without reading the entire source."""
    with Path(path).open("rb") as handle:
        size = handle.seek(0, 2)
        pos = size
        while pos:
            start = max(0, pos - 65536)
            handle.seek(start)
            data = handle.read(pos - start)
            at = data.rfind(b"\n")
            if at >= 0:
                return start + at + 1
            pos = start
    return 0


def freeze(root, state_dir, batch, request):
    if request != REQUEST:
        raise ValueError("unexpected historical request")
    logs = Path(root, "logs")
    cuts = {p.name: complete_cut(p) for p in (logs / name for name in
            ("runs.jsonl", "states.jsonl", "decisions.jsonl", "brain.jsonl", "sl-attempts.jsonl", "run-config.jsonl")) if p.is_file()}
    rows = {}
    with (logs / "runs.jsonl").open("rb") as handle:
        while handle.tell() < cuts.get("runs.jsonl", 0):
            try:
                row = json.loads(handle.readline())
            except ValueError:
                continue
            if (isinstance(row, dict) and str(row.get("character", "IRONCLAD")).lower() == "silent"
                    and re.fullmatch(r"[A-Z0-9]{12}", str(row.get("run_id", ""))) and row.get("ended")):
                rows[row["run_id"]] = {k: row.get(k) for k in ("run_id", "ended", "ascension", "code", "victory", "floor")}
    if not rows:
        raise ValueError("no completed Silent evidence")
    manifest = {"request_id": request, "batch": batch, "character": "silent", "frozen_at": time.time(),
                "runs": sorted(rows.values(), key=lambda row: (row["ended"], row["run_id"])),
                "log_byte_limits": cuts, "logs": str(logs.resolve()),
                "policy": "all historical Silent evidence; performance cohorts remain separate",
                "unknown": "Whole-log prefix SHA was not measured; preserve offsets and hash extracted evidence instead."}
    path = Path(state_dir, "learner", batch + ".core-input.json")
    if path.exists():
        raise ValueError("frozen input already exists; preserve it")
    atomic_json(path, manifest)
    return str(path)


def validate(report, batch, root):
    """Validate identity and preserved artifacts; gameplay conclusions still require ops review."""
    if (report.get("task") != TASK or report.get("request_id") != REQUEST
            or batch.get("feature_request") != REQUEST or report.get("character") != "silent"
            or report.get("complete") is not True or report.get("status") not in ("complete", "insufficient_evidence")):
        raise ValueError("incomplete or mismatched core-build report")
    manifest_path = Path(batch["core_evidence"])
    manifest = json.loads(manifest_path.read_text())
    manifest_sha = digest(manifest_path)
    if (report.get("batch") != manifest["batch"] or report.get("input_sha256") != manifest_sha
            or batch.get("core_evidence_sha256") != manifest_sha
            or manifest.get("request_id") != REQUEST or manifest.get("character") != "silent"):
        raise ValueError("report does not identify the dispatched frozen inputs")
    expected = {row["run_id"] for row in manifest["runs"]}
    covered = report.get("covered_runs")
    if not isinstance(covered, list) or len(covered) != len(expected) or set(covered) != expected:
        raise ValueError("full historical run inventory is missing")
    coverage = report.get("coverage")
    if not isinstance(coverage, dict) or any(coverage.get(key) is not True for key in SECTIONS):
        raise ValueError("report sections are incomplete")
    candidates = report.get("candidate_builds")
    if not isinstance(candidates, list) or (not candidates and report["status"] != "insufficient_evidence"):
        raise ValueError("missing candidates or explicit insufficient-evidence conclusion")
    if (not isinstance(report.get("limitations"), list) or not report["limitations"]
            or any(not isinstance(value, str) or not value.strip() for value in report["limitations"])):
        raise ValueError("evidence limitations must be explicit")
    for candidate in candidates:
        if (not isinstance(candidate, dict) or not isinstance(candidate.get("name"), str) or not candidate["name"].strip()
                or not isinstance(candidate.get("evidence_runs"), list) or not candidate["evidence_runs"]
                or not set(candidate["evidence_runs"]).issubset(expected)):
            raise ValueError("candidate lacks dispatched character evidence")
    tree = Path(batch["worktree"]).resolve()
    allowed = (tree / "learner/runs").resolve()
    path = Path(report["report"]).resolve()
    if (tree != Path(root, ".worktrees", TASK).resolve() or not allowed.is_relative_to(tree)
            or not path.is_relative_to(allowed) or path.suffix != ".md" or not path.is_file()
            or path.stat().st_size < 100):
        raise ValueError("report is not preserved inside the dispatched study worktree")
    return {"path": str(path), "sha256": digest(path), "input_sha256": digest(manifest_path),
            "status": report["status"], "candidate_names": [row["name"] for row in candidates]}


def finish(batch_id, batch, rc, root, state_dir, enqueue):
    from learner_checks import read_report
    report = read_report(str(Path(state_dir, "learner", batch_id + ".out")))
    try:
        if rc:
            raise ValueError(f"learner exit {rc}")
        accepted = validate(report, batch, root)
    except (ValueError, OSError, KeyError, TypeError) as error:
        batch.update(state="failed", rc=rc, report=report, acceptance_error=str(error), retry_at=time.time() + 3600)
        update_request(root, state="pending", dispatch_status="failed_report_retry_pending",
                       last_failure=str(error), last_failed_batch=batch_id)
        enqueue("core-builds-failed", f"全历史核心构筑批次 {batch_id} 验收失败：{error}。原报告与冻结输入保留。")
        return
    batch.update(state="done", rc=rc, report=report, accepted_report=accepted)
    update_request(root, state="done", dispatch_status="report_ready_for_ops_review", batch=batch_id,
                   completed_at=time.time(), report=accepted["path"], report_sha256=accepted["sha256"],
                   result_notification={"state": "pending_ops_verification", "batch": batch_id})
    enqueue("core-builds-done", f"全历史核心构筑学习 {batch_id} 已完成身份/范围验收；报告 {accepted['path']}，"
            f"SHA256={accepted['sha256']}。请核对实质候选、逐boss矩阵、伤害资源、构筑模板与限制，"
            f"向Roy双收件箱回报后调用 bash ops/codex-ops-do.sh core-build-notify {batch_id}。"
            "报告不是已上线规则；不重复派发或把入口修复当学习结果。")


def notify(batch_id, batch, root, state_dir, run=subprocess.run):
    """A broker-only action, called after ops has reviewed the substantive report."""
    import fcntl
    if batch.get("state") != "done":
        raise ValueError("no completed core-build study")
    accepted = validate(batch["report"], batch, root)
    if accepted != batch.get("accepted_report"):
        raise ValueError("accepted report changed; preserve it and re-verify separately")
    identity = hashlib.sha256((REQUEST + batch_id + accepted["sha256"]).encode()).hexdigest()
    path = Path(state_dir, "core-notifications", identity + ".json")
    path.parent.mkdir(parents=True, exist_ok=True)
    with (path.parent / "notify.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if path.exists():
            return json.loads(path.read_text())
        atomic_json(path, {"state": "claimed", "batch": batch_id, "report": accepted, "at": time.time()})
    names = "、".join(accepted["candidate_names"]) or "证据不足，已说明缺口"
    try:
        result = run(["herdr", "notification", "show", "--body", names + "；报告 " + accepted["path"],
                      "--sound", "done", "静默核心组合学习已有结果"], capture_output=True, text=True, timeout=20)
        receipt = {"state": "sent" if result.returncode == 0 else "failed", "rc": result.returncode,
                   "batch": batch_id, "report": accepted, "at": time.time(),
                   "stdout": result.stdout or "", "stderr": result.stderr or ""}
    except (OSError, subprocess.SubprocessError) as error:
        receipt = {"state": "uncertain", "error": str(error), "batch": batch_id, "report": accepted, "at": time.time()}
    atomic_json(path, receipt)
    update_request(root, result_notification=receipt)
    return receipt
