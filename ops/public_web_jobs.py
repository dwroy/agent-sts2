"""Explicit manual content research on the original strategy slot and runtime callback."""
import hashlib
import json
from pathlib import Path
import re

TEMPLATE = "learner/tasks/public-web/strategy-proposal.md"


QUESTION_FIELDS = {"schema", "id", "task", "character", "question", "source_intent", "target_game_version", "parent"}


def question_document(raw):
    if not isinstance(raw, str) or len(raw.encode()) > 16384:
        raise ValueError("invalid public web question size")
    body = json.loads(raw)
    if (not isinstance(body, dict) or set(body) != QUESTION_FIELDS or body["schema"] != "public-web-question-v1"
            or body["task"] != "strategy-proposal" or body["character"] != "silent"
            or not isinstance(body["id"], str) or not re.fullmatch(r"[a-z0-9][a-z0-9._-]{0,79}", body["id"])
            or body["source_intent"] != "search-and-open-public-sts2"
            or not isinstance(body["question"], str) or not 1 <= len(body["question"].strip()) <= 4000
            or not isinstance(body["target_game_version"], str) or not 1 <= len(body["target_game_version"].strip()) <= 64
            or not isinstance(body["parent"], str) or not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}", body["parent"])):
        raise ValueError("invalid public web question contract")
    return body


def question_binding(value):
    if not isinstance(value, dict) or set(value) != {"path", "sha256", "content"}:
        raise ValueError("invalid public web question binding")
    path = value["path"]
    if (not isinstance(path, str) or not path.startswith("learner/requests/public-web/") or not path.endswith(".json")
            or any(part in ("", ".", "..") for part in path.split("/")) or "\\" in path):
        raise ValueError("question path outside explicit public input directory")
    body = question_document(value["content"])
    if hashlib.sha256(value["content"].encode()).hexdigest() != value["sha256"]:
        raise ValueError("public web question SHA mismatch")
    return body


def load_question(root, path, expected):
    """Read only an explicit repository input; freeze bytes before starting the original wrapper."""
    root = Path(root).resolve()
    path = Path(path)
    path = path if path.is_absolute() else root / path
    relative = path.relative_to(root)
    # Check lexical boundary before opening any caller-selected file.
    binding = {"path": relative.as_posix(), "sha256": expected, "content": ""}
    if (not binding["path"].startswith("learner/requests/public-web/") or path.suffix != ".json"
            or ".." in relative.parts or path.resolve() != path or path.stat().st_size > 16384):
        raise ValueError("invalid public web question path")
    binding["content"] = path.read_bytes().decode("utf8")
    question_binding(binding)
    return binding


def question_key(binding):
    return "public-web-question:" + question_binding(binding)["id"] + ":" + binding["sha256"]


def contract(root, question=None):
    raw = Path(root, TEMPLATE).read_bytes()
    value = {"schema": "public-web-research-v1", "template_sha256": hashlib.sha256(raw).hexdigest()}
    if question is not None:
        question_binding(question)
        value["question"] = question
    return value


def saved_contract(root, value):
    if not isinstance(value, dict) or ("question" in value and value["question"] is None):
        raise ValueError("invalid original public web contract")
    return value == contract(root, value.get("question"))


def batch_question(batch):
    value = batch.get("public_web", {})
    binding = value.get("question")
    key = batch.get("key", "")
    if "question" in value:
        if key != question_key(binding):
            raise ValueError("question lost original dispatch key")
    elif isinstance(key, str) and key.startswith("public-web-question:"):
        raise ValueError("original question input is missing")
    return binding


def prepare(root, directory, bid, character, tree):
    from learner_entry import lease_identity
    from knowledge_runtime_env import bound_batch
    state_file = Path(directory, "learn.json")
    batch = json.loads(state_file.read_bytes())["batches"][bid]
    batch_question(batch)
    if (not lease_identity(root, tree, bid, str(state_file)) or not saved_contract(tree, batch.get("public_web"))
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
    batch_question(batch)
    if (not saved_contract(tree, batch.get("public_web")) or batch.get("task") != "strategy-proposal" or batch.get("reason") != "ops"
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
    native_searches = set()
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
                if isinstance(action, dict) and action.get("type") == "search":
                    native_searches.add(p.get("id", p.get("call_id")))
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
    result = {**proof, "native_completed_ids": sorted(x for x in native_ids if isinstance(x, str)), "manifest": str(path)}
    if "question" in batch["public_web"]:
        binding = batch["public_web"]["question"]
        question = question_binding(binding)
        answer = report.get("public_web_question")
        if (not isinstance(answer, dict) or set(answer) != {"id", "input_sha256", "status", "version_match", "conclusion"}
                or answer["id"] != question["id"] or answer["input_sha256"] != binding["sha256"]
                or answer["status"] not in ("answered", "waiting") or answer["version_match"] not in ("matched", "mismatch", "unknown")
                or not isinstance(answer["conclusion"], str) or not answer["conclusion"].strip()):
            raise ValueError("missing/mismatched public web question result")
        read_ids = sorted(row["native_call_id"] for row in body["sources"] if row["status"] == "read")
        search_ids = sorted(x for x in native_searches if isinstance(x, str))
        if answer["status"] == "answered" and (not search_ids or not read_ids):
            raise ValueError("question answered requires actual search and source page reading")
        result["question"] = {**answer, "source_intent": question["source_intent"], "target_game_version": question["target_game_version"],
                              "parent": question["parent"], "native_search_ids": search_ids, "native_read_ids": read_ids}
    return result


if __name__ == "__main__":
    import sys
    try:
        print(prepare(*sys.argv[1:]))
    except (OSError, ValueError, KeyError, TypeError):
        raise SystemExit("public web registration unavailable; no model started")
