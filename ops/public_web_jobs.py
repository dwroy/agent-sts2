"""Explicit manual content research on the original strategy slot and runtime callback."""
import hashlib
import json
from pathlib import Path

TEMPLATE = "learner/tasks/public-web/strategy-proposal.md"


def contract(root):
    raw = Path(root, TEMPLATE).read_bytes()
    return {"schema": "public-web-research-v1", "template_sha256": hashlib.sha256(raw).hexdigest()}


def prepare(root, directory, bid, character, tree):
    from learner_entry import lease_identity
    from knowledge_runtime_env import bound_batch
    state_file = Path(directory, "learn.json")
    batch = json.loads(state_file.read_bytes())["batches"][bid]
    if (not lease_identity(root, tree, bid, str(state_file)) or batch.get("public_web") != contract(tree)
            or batch.get("task") != "strategy-proposal" or batch.get("character") != character or character != "silent"
            or batch.get("reason") != "ops" or batch.get("runs") != []
            or any(batch.get(k) for k in ("external_source", "backfill_source", "proposal_ids", "proposal_repair", "research_request", "implementation_request"))):
        raise ValueError("public web batch/template mismatch")
    with bound_batch(root, batch) as selected:
        if not selected.get("STS2_KNOWLEDGE_RUNTIME"):
            raise ValueError("public web requires original knowledge runtime")
    return str(Path(tree, TEMPLATE))


def source_proof(root, bid, batch, report, candidate):
    """Validate saved inputs before using the original K1 publisher; never infers adoption."""
    import importlib.util
    import subprocess
    tree = Path(batch["worktree"]).resolve()
    if (batch.get("public_web") != contract(tree) or batch.get("task") != "strategy-proposal" or batch.get("reason") != "ops"
            or batch.get("character") != "silent" or batch.get("runs") != []
            or report.get("task") != batch["task"] or report.get("character") != "silent" or report.get("batch") != bid
            or report.get("runs") != [] or report.get("commit") or report.get("merged") or report.get("fixes")
            or report.get("implementation_domains")
            or any(batch.get(k) for k in ("external_source", "backfill_source", "proposal_ids", "proposal_repair", "research_request", "implementation_request"))):
        raise ValueError("public web content identity mismatch")
    path = Path(report["public_web_sources"])
    path.relative_to(tree / "learner/runs")
    if path.name != "public-web-sources.json" or path.resolve() != path:
        raise ValueError("source manifest escaped original scratch")
    scratch = path.parent
    report_path = Path(report["report"])
    if report_path.parent != scratch or report_path.is_symlink() or not report_path.is_file():
        raise ValueError("missing original research report")
    # Reuse the installed verifier, never execute a learner-supplied module or URL.
    spec = importlib.util.spec_from_file_location("public_web_sources", Path(root, "learner/public_web_sources.py"))
    sources = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(sources)
    proof = sources.verify(str(scratch), bid)
    body = json.loads(path.read_bytes())
    events = scratch / "public-web-events.jsonl"
    native_ids = set()
    native_reads = {}
    if events.exists():
        for raw in sources.checked_file(events).splitlines():
            item = json.loads(raw)
            event = item["event"]
            # Hash the saved bytes, avoiding JS/Python float serialization differences.
            native = item["event_json"].encode()
            if (item.get("schema") != "public-web-event-v1" or json.loads(native) != event
                    or hashlib.sha256(native).hexdigest() != item.get("sha256")):
                raise ValueError("native web event hash mismatch")
            p = event.get("payload", event.get("item", {}))
            if ((event.get("type") == "response_item" and p.get("type") == "web_search_call" and p.get("status") == "completed")
                    or (event.get("type") == "item.completed" and p.get("type") == "web_search" and p.get("status", "completed") == "completed")
                    or (event.get("type") == "event_msg" and p.get("type") == "web_search_end")):
                native_ids.add(p.get("id", p.get("call_id")))
                action = p.get("action", {})
                if isinstance(action, dict) and action.get("type") in ("open_page", "open"):
                    native_reads[p.get("id", p.get("call_id"))] = action.get("url")
    for row in body["sources"]:
        if row["status"] == "read" and native_reads.get(row["native_call_id"]) != row["url"]:
            raise ValueError("read source lacks original completed page-open event for its URL")
    if candidate:
        if proof["usable"] == 0:
            raise ValueError("empty/failed search cannot publish unsupported knowledge")
        content = "\n".join(candidate["files"].values())
        results = report.get("public_web_results", [])
        if (not isinstance(results, list) or len(results) != len(body["sources"])
                or {r["source_id"] for r in results} != {r["id"] for r in body["sources"]}
                or not any(r.get("state") == "cited" for r in results)):
            raise ValueError("candidate requires complete per-source dispositions")
        for row in body["sources"]:
            result = next(r for r in results if r["source_id"] == row["id"])
            if result.get("state") not in ("cited", "unused", "waiting") or not result.get("reason"):
                raise ValueError("missing source disposition/limitation")
            if result["state"] == "cited" and (row["status"] not in ("read", "cached") or row["summary_sha256"] not in content):
                raise ValueError("candidate must retain cited source summary SHA provenance")
    changed = subprocess.run(["git", "-C", str(tree), "status", "--porcelain", "--untracked-files=all"], capture_output=True, text=True, check=True, timeout=20).stdout
    head = subprocess.run(["git", "-C", str(tree), "rev-parse", "HEAD"], capture_output=True, text=True, check=True, timeout=10).stdout.strip()
    if changed.strip() or report.get("base") != head:
        raise ValueError("public research changed original source tree")
    return {**proof, "native_completed_ids": sorted(x for x in native_ids if isinstance(x, str)), "manifest": str(path)}


if __name__ == "__main__":
    import sys
    try:
        print(prepare(*sys.argv[1:]))
    except (OSError, ValueError, KeyError, TypeError):
        raise SystemExit("public web registration unavailable; no model started")
