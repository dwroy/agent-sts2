"""Knowledge-only completion path. Preserve ordinary source/proposal checks for other reports."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess


def run_key(screen, run_id, session, config_log):
    """New single-run launches get a key; a restart must recover its exact original binding."""
    if screen in ("MAIN_MENU", "CHARACTER_SELECT", "GAME_OVER"):
        if not re.fullmatch(r"[a-zA-Z0-9_.:+-]{1,160}", session):
            raise ValueError("invalid launch session identity")
        return "launch:" + session
    if not re.fullmatch(r"[A-Z0-9]{12}", run_id):
        raise ValueError("unknown runtime run identity; keep current game unchanged")
    # Bound startup work without silently treating a truncated history as a new run.
    with Path(config_log).open("rb") as handle:
        handle.seek(0, 2)
        size = handle.tell()
        handle.seek(max(0, size - 2 * 1024 * 1024))
        if size > 2 * 1024 * 1024:
            handle.readline()
        rows = handle.read().splitlines()
    for raw in reversed(rows):
        row = json.loads(raw)
        if row.get("run_id") != run_id:
            continue
        knowledge = row.get("knowledge", {})
        key = knowledge.get("runtime_binding")
        if not key or not re.fullmatch(r"K1-[a-f0-9]{64}", knowledge.get("runtime_version", "")):
            raise ValueError("existing run has no verified runtime binding")
        return key
    raise ValueError("existing run binding is unavailable; do not select latest")


def audit_proposals(report, batch, body, before, root):
    """Reuse the existing evidence-to-code proposal obligation without requiring a content Git commit."""
    spec = importlib.util.spec_from_file_location("runtime_code_proposals", Path(root, "learner/code_proposals.py"))
    lib = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(lib)
    proposals = lib.fold(Path(root, lib.QUEUE))
    errors = lib.report_links(report, proposals, batch["character"])
    path = f"characters/{batch['character']}/experience.json"
    if path in body.get("files", {}):
        errors += lib.audit_experience(json.loads(before.get(path, '{"entries":[]}')),
                                       json.loads(body["files"][path]), proposals, batch["character"])
    if errors:
        raise ValueError("runtime proposal chain incomplete: " + "; ".join(errors))


def complete(batch_id, batch, report, rc, root, enqueue, inbox):
    candidate = report.get("knowledge_candidate")
    if candidate is None:
        return False
    previous = batch.get("knowledge_publication")
    try:
        if rc != 0 or report.get("commit") or report.get("merged") or report.get("implementation_domains"):
            raise ValueError("knowledge completion requires successful content-only output; code uses original pipeline")
        runtime = os.environ.get("STS2_KNOWLEDGE_RUNTIME")
        if not runtime or not os.path.isabs(runtime):
            raise ValueError("runtime knowledge publisher is not enabled")
        tree = Path(batch["worktree"]).resolve()
        original_path = Path(candidate)
        path = original_path.resolve()
        allowed = (tree / "learner" / "runs").resolve()
        allowed.relative_to(tree)
        path.relative_to(allowed)
        if original_path.is_symlink() or path.stat().st_size > 32 * 1024 * 1024:
            raise ValueError("invalid candidate file")
        raw = path.read_bytes()
        body = json.loads(raw)
        if body.get("id") != batch_id or body.get("character") != batch["character"]:
            raise ValueError("candidate does not match original batch/character")
        # A content callback cannot smuggle executable changes around the source pipeline.
        changed = subprocess.run(["git", "-C", str(tree), "status", "--porcelain", "--untracked-files=all"],
                                 capture_output=True, text=True, check=True, timeout=20).stdout
        if changed.strip():
            raise ValueError("source changes require original code delivery/checks")
        head = subprocess.run(["git", "-C", str(tree), "rev-parse", "HEAD"], capture_output=True, text=True, check=True, timeout=10).stdout.strip()
        if report.get("base") != head or batch.get("candidate_mode", {}).get("dispatch_base", head) != head:
            raise ValueError("content task changed original dispatch HEAD")
        proof = None
        approval = None
        if batch.get("external_source") or batch.get("backfill_source"):
            from strategy_backfill_jobs import report_proof
            proof = report_proof(report, batch, root)
            approval = path.with_name("runtime-source-approval.json")
            approval.write_text(json.dumps(proof["destination_files"], ensure_ascii=False))
        code = subprocess.run(["git", "-C", root, "rev-parse", "HEAD"], capture_output=True, text=True, check=True, timeout=10).stdout.strip()
        if not re.fullmatch(r"[a-f0-9]{40}", code):
            raise ValueError("unknown publisher code version")
        command = [os.environ.get("STS2_NODE_BIN", "node"), "--import", "tsx", str(Path(root, "agent/tools/knowledge-runtime.ts")),
                   "complete", "--runtime", runtime, "--candidate", str(path), "--id", batch_id, "--code", code]
        if approval:
            command += ["--approval", str(approval)]
        # Reuse the source proposal audit against the actual database base, not stale Git knowledge.
        before = {}
        if f"characters/{batch['character']}/experience.json" in body.get("files", {}):
            exported = path.with_name("runtime-published-base.json")
            export_command = command[:4] + ["export", "--runtime", runtime, "--version", body["base"], "--character", batch["character"], "--destination", str(exported)]
            if exported.exists():
                exported.unlink()  # Rebuildable read-only base; never the original candidate or report.
            subprocess.run(export_command, cwd=str(Path(root, "agent")), capture_output=True, text=True, timeout=120, check=True)
            before = json.loads(exported.read_bytes())
        audit_proposals(report, batch, body, before, root)
        result = subprocess.run(command, cwd=str(Path(root, "agent")), capture_output=True, text=True, timeout=120, check=True)
        receipt = json.loads(result.stdout)
        if receipt.get("candidate") != batch_id or not re.fullmatch(r"K1-[a-f0-9]{64}", receipt.get("version", "")):
            raise ValueError("invalid publisher receipt")
        batch.update(state="done", rc=rc, report=report, knowledge_publication={**receipt, "candidate_sha256": hashlib.sha256(raw).hexdigest()},
                     checks_pending=False)
        batch.pop("knowledge_pending", None)
        batch.setdefault("knowledge_attempts", []).append({"state": "published", "version": receipt["version"]})
        if proof:
            kind = "external" if batch.get("external_source") else "backfill"
            batch[kind + "_result"] = proof["dispositions"]
            batch[kind + "_output_files"] = proof["destination_files"]
        if not previous or previous.get("version") != receipt["version"]:
            enqueue("knowledge-done", f"知识批次 {batch_id} 已事务发布 {receipt['version']}；源码 {code}；待生产工具读回及自然局消费，不代学习父验收。")
    except (ValueError, OSError, KeyError, TypeError, AttributeError, ImportError, subprocess.SubprocessError) as error:
        # A timeout is uncertain: retry complete with the SAME id, querying actual database result first.
        batch.update(state="awaiting_review", rc=rc, report=report, knowledge_pending=True)
        batch.setdefault("knowledge_attempts", []).append({"state": "pending", "error": type(error).__name__})
        inbox(f"知识批次 {batch_id} 发布待核：{type(error).__name__}；保留原候选，以同一ID查实际结果后重试，不改源码/live或反证。")
    return True


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["run-key"])
    parser.add_argument("--screen", required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--session", required=True)
    parser.add_argument("--config-log", required=True)
    args = parser.parse_args()
    try:
        print(run_key(args.screen, args.run_id, args.session, args.config_log))
    except (OSError, ValueError, TypeError, AttributeError):
        raise SystemExit("runtime knowledge binding unavailable; original game/knowledge preserved")
