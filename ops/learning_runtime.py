"""Dispatch-bound operational completion. Never publishes decision knowledge or source."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import sqlite3
import copy

from learning_runtime_store import Store, ID, KINDS, SHA, atomic, checked_file, packed, sha

SELECTION = "operational-runtime-selection-v1"
CONTROL = "operational-runtime-control-v1"


def capture(root, state_dir=None, task=None):
    root = Path(root).resolve()
    state_dir = Path(state_dir or os.environ.get("CODEX_OPS_DIR") or root / "ops/codex-ops")
    path = state_dir / "learning-runtime.json"
    if not path.exists():
        return {"schema": SELECTION, "enabled": False, "root": str(root), "read_directories": read_directories(root, state_dir)}
    raw = checked_file(root, path, 8192)
    body = json.loads(raw)
    if (set(body) != {"schema", "root", "enabled", "directory", "entries", "refresh", "methods"}
            or body["schema"] != CONTROL or body["root"] != str(root) or type(body["enabled"]) is not bool
            or not isinstance(body["entries"], list) or not isinstance(body["refresh"], list) or not isinstance(body["methods"], dict)
            or any(not isinstance(k, str) or not isinstance(v, str) or not SHA.fullmatch(v) for k, v in body["methods"].items())
            or any(not isinstance(x, str) or not re.fullmatch(r"[a-z][a-z0-9-]*", x) for x in body["entries"] + body["refresh"])):
        raise ValueError("invalid operational runtime control")
    directory = Path(body["directory"])
    if (not directory.is_absolute() or directory.resolve() != directory or not directory.is_relative_to(root / "data")
            or directory == root / "data" or str(directory).startswith("/mnt/")):
        raise ValueError("runtime must be a local instance data subdirectory")
    current = directory
    while current != root:
        if current.is_symlink():
            raise ValueError("linked runtime directory")
        current = current.parent
    if body["enabled"] and (not (directory / "learning.sqlite").is_file() or (directory / "learning.sqlite").is_symlink()):
        raise ValueError("original operational database unavailable; initialize/restore before enabling")
    enabled = body["enabled"] and (task is None or task in body["entries"])
    return {"schema": SELECTION, "enabled": enabled, "root": str(root), "directory": str(directory),
            "control_sha256": sha(raw), "entries": body["entries"], "refresh": body["refresh"], "methods": body["methods"],
            "read_directories": sorted({str(directory), *read_directories(root, state_dir)})}


def read_directories(root, state_dir):
    state = Path(state_dir) / "learn.json"
    directories = set()
    if state.exists():
        batches = json.loads(checked_file(root, state, 128 * 1024 * 1024)).get("batches", {})
        for batch in batches.values():
            original = batch.get("operational_runtime", {})
            if original.get("schema") == SELECTION and original.get("root") == str(root) and original.get("enabled"):
                directory = Path(original["directory"])
                if not directory.is_absolute() or not directory.is_relative_to(Path(root) / "data"):
                    raise ValueError("foreign original operational directory")
                directories.add(str(directory))
    return sorted(directories)


def selection(root, batch):
    value = batch.get("operational_runtime")
    if (not isinstance(value, dict) or value.get("schema") != SELECTION or value.get("root") != str(Path(root).resolve())
            or value.get("enabled") is not True):
        raise ValueError("no original operational dispatch contract")
    directory = Path(value["directory"])
    if not directory.is_absolute() or directory.resolve() != directory or not directory.is_relative_to(Path(root).resolve() / "data"):
        raise ValueError("invalid original runtime directory")
    return value


def git(tree, *args):
    return subprocess.check_output(["git", "-C", str(tree), *args], timeout=20).decode().strip()


def source_rebase(root, tree, body, report, head, changed):
    """Use registered file/SHA inputs, never a guessed knowledge directory."""
    if subprocess.run(["git", "-C", str(tree), "merge-base", "--is-ancestor", body["base"], head],
                      capture_output=True, timeout=20).returncode:
        raise ValueError("source overlap unknown: original base is not an ancestor")
    inputs = []

    def registered(ref, origin, base=root):
        if (not isinstance(ref, dict) or not isinstance(ref.get("path"), str)
                or not SHA.fullmatch(ref.get("sha256", ""))):
            raise ValueError("source overlap unknown: missing fixed input registration at " + origin)
        path = Path(ref["path"])
        # These are file identities in this repository, not directory families.
        if ".." in path.parts:
            raise ValueError("source overlap unknown: invalid fixed input path at " + origin)
        path = path if path.is_absolute() else base / path
        within = tree if path.is_relative_to(tree) else root
        if not path.is_relative_to(within):
            raise ValueError("source overlap unknown: foreign fixed input at " + origin)
        inputs.append(dict(path=path.relative_to(within).as_posix(), sha256=ref["sha256"], registration=origin,
                           **{k: ref[k] for k in ("offset", "length") if k in ref}))

    allowed = tree / "learner/runs"
    registered(body.get("report"), "report", allowed)
    records = body.get("records")
    if not isinstance(records, list) or not records:
        raise ValueError("source overlap unknown: missing fixed input records")
    for index, record in enumerate(records):
        refs = record.get("evidence") if isinstance(record, dict) else None
        if not isinstance(refs, list) or not refs:
            raise ValueError("source overlap unknown: missing fixed input evidence for record " + str(index))
        for ordinal, ref in enumerate(refs):
            registered(ref, f"records[{index}].evidence[{ordinal}]")
        payload = record.get("payload", {})
        for name in ("knowledge_inputs", "method_inputs"):
            if isinstance(payload, dict) and name in payload:
                mapping = payload[name]
                if not isinstance(mapping, dict) or not mapping:
                    raise ValueError("source overlap unknown: invalid " + name)
                for path, digest in mapping.items():
                    registered(dict(path=path, sha256=digest), f"records[{index}].payload.{name}")
        if isinstance(payload, dict) and any(payload.get(k) for k in ("method_sha256", "knowledge_sha256")):
            raise ValueError("source overlap unknown: opaque method/knowledge SHA requires its original input manifest")
    writes = [Path(report["operational_candidate"]), Path(body["report"]["path"])]
    writes = [path if path.is_absolute() else allowed / path for path in writes]
    if any(not path.is_relative_to(tree) or ".." in path.parts for path in writes):
        raise ValueError("source overlap unknown: candidate output path")
    writes = sorted({path.relative_to(tree).as_posix() for path in writes})
    protected = {ref["path"] for ref in inputs} | set(writes)
    overlap = sorted(path for path in changed if any(
        path == ref or path.startswith(ref + "/") or ref.startswith(path + "/") for ref in protected))
    if overlap:
        raise ValueError("source/knowledge changes require engineering delivery; intersecting leaves: " + ", ".join(overlap))
    return dict(schema="operational-source-revalidation-v1", original_base=body["base"], new_base=head,
                changed_paths=sorted(changed), write_paths=writes, fixed_inputs=inputs,
                input_registration="operational-candidate-v1 report/evidence and explicit payload input SHA maps",
                intersection=[], decision="disjoint", original_candidate_base_preserved=True)


def validate(root, batch_id, batch, report, rc, *, revalidation=None):
    root = Path(root).resolve()
    chosen = selection(root, batch)
    if rc != 0 or not ID.fullmatch(batch_id):
        raise ValueError("failed learner/invalid batch")
    tree = Path(batch.get("worktree") or root).resolve()
    if tree != root and tree.parent != root / ".worktrees":
        raise ValueError("foreign worktree")
    allowed = tree / "learner/runs"
    path = Path(report["operational_candidate"])
    raw = checked_file(allowed, path)
    body = json.loads(raw)
    required = {"schema", "id", "task", "character", "records", "runs", "parents", "proposals", "ledger_ids", "report", "base"}
    task = batch.get("learner_task", batch.get("task", "postmortem"))
    if (set(body) != required or body["schema"] != "operational-candidate-v1" or body["id"] != batch_id
            or body["character"] != batch["character"] or body["task"] != task or task not in chosen["entries"]
            or report.get("character", body["character"]) != body["character"] or report.get("task") != batch.get("task", "postmortem")):
        raise ValueError("candidate contract/identity mismatch")
    if not re.fullmatch(r"[a-f0-9]{40}", body["base"]):
        raise ValueError("missing original source base")
    # A mixed task may store its independent operational records, but its source
    # completion still goes through the engineering path below the caller.
    engineering = any(report.get(k) for k in ("commit", "merged", "fixes", "source_commit", "implementation_domains"))
    rebased = None
    head = git(tree, "rev-parse", "HEAD")
    if not engineering:
        exclusions = [":(exclude)notes/lessons.md", ":(exclude)paper/materials/learning/ledger.jsonl", ":(exclude)paper/materials/learning/code-proposals.jsonl"]
        if task == "silent-boss-calibration":
            fixed_store = Store(chosen["directory"], readonly=True)
            try:
                fixed = fixed_store.data_receipt(batch_id + ":calibration")
                if not fixed:
                    raise ValueError("missing fixed calibration receipt")
                name = "characters/silent/boss-trust.json"
                if fixed["version"]:
                    expected = fixed_store.manifest(fixed["version"])[name]
                    if sha(checked_file(tree / "knowledge", tree / "knowledge" / name)) != expected:
                        raise ValueError("calibration compatibility view differs from fixed producer")
                    exclusions.append(":(exclude)knowledge/" + name)
            finally:
                fixed_store.close()
        from learner_checks import SOURCE_PATHS
        guarded = [*SOURCE_PATHS, ".agents", "knowledge/common", "knowledge/characters"] if tree == root else ["."]
        dirty = git(tree, "status", "--porcelain", "--untracked-files=all", "--", *guarded, *exclusions)
        if dirty:
            raise ValueError("source/knowledge changes require engineering delivery")
        changed = git(tree, "diff", "--name-only", "--no-renames", "-z", body["base"], head,
                      "--", *guarded, *exclusions).split("\0")
        changed = [path for path in changed if path]
        if body["base"] != head:
            if changed and task == "silent-boss-calibration":
                raise ValueError("source overlap unknown: fixed producer needs its original method/input manifest")
            rebased = source_rebase(root, tree, body, report, head, changed)
    for key in ("runs", "parents", "proposals", "ledger_ids"):
        if not isinstance(body[key], list) or len(set(body[key])) != len(body[key]) or any(not isinstance(x, str) or not ID.fullmatch(x) for x in body[key]):
            raise ValueError("invalid stable links: " + key)
    if not set(batch.get("runs", [])) == set(body["runs"]):
        raise ValueError("dispatched evidence coverage mismatch")
    if task == "ascension-audit":
        coverage = report.get("coverage")
        if (type(batch.get("audit_level")) is not int or report.get("level") != batch["audit_level"] or report.get("complete") is not True
                or not isinstance(coverage, list) or any(not isinstance(c, str) for c in coverage)
                or not {"floors", "combat_counts", "healing", "campfires", "rules", "assumptions"} <= set(coverage)
                or not isinstance(report.get("runs"), list) or not report["runs"] or not set(report["runs"]) <= set(batch["runs"])):
            raise ValueError("incomplete original ascension audit coverage")
    if task == "postmortem" and (set(report.get("appended", [])) != set(body["runs"]) or report.get("skipped")
                                  or report.get("ledger", {}).get("check") != 0):
        raise ValueError("incomplete postmortem/ledger validation")
    for key in ("learning_request", "research_request", "implementation_request", "audit_key", "feature_request"):
        if batch.get(key) and batch[key] not in body["parents"]:
            raise ValueError("original parent link missing: " + key)
    if set(body["proposals"]) != set(report.get("code_proposals", [])):
        raise ValueError("proposal links differ from final report")
    from proposal_dispatch import links
    errors = links(report, batch, str(root), str(root / "ops"))
    if errors:
        raise ValueError("proposal audit: " + "; ".join(errors))
    # The legacy CLI remains the ledger authority; importing does not mark shipped.
    if body["ledger_ids"]:
        import importlib.util
        spec = importlib.util.spec_from_file_location("operational_ledger", root / "learner/ledger.py")
        ledger = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(ledger)
        ledger_path = root / "paper/materials/learning/ledger.jsonl"
        if ledger.check_file(str(ledger_path)):
            raise ValueError("original ledger validator failed")
        items = ledger.fold(ledger.read_rows(str(ledger_path)))
        if set(body["ledger_ids"]) - set(items):
            raise ValueError("unknown ledger ID")
        if any(items[key].get("character") != body["character"] for key in body["ledger_ids"]):
            raise ValueError("foreign ledger ID")
        if task == "postmortem":
            for run in body["runs"]:
                if not any(run in {e.get("run") for e in items[key].get("evidence", [])} | set(items[key].get("where", {}).get("lessons", [])) for key in body["ledger_ids"]):
                    raise ValueError("postmortem run lacks original ledger evidence")
    elif task == "postmortem":
        raise ValueError("postmortem has no ledger links")
    run_rows = {}
    runs_path = root / "logs/runs.jsonl"
    if body["runs"] and runs_path.exists():
        with runs_path.open() as stream:
            for line in stream:
                if not line.endswith("\n"):
                    continue  # An unrelated final append has not been sealed yet.
                row = json.loads(line)
                if not isinstance(row, dict):
                    raise ValueError("invalid run metadata row")
                if row.get("run_id") in body["runs"]:
                    run_rows[row["run_id"]] = row
    if any(run not in run_rows or not run_rows[run].get("ended") or str(run_rows[run].get("character", "IRONCLAD")).lower() != body["character"] for run in body["runs"]):
        raise ValueError("missing/wrong-character run evidence")
    objects = {sha(raw): raw}
    evidence_runs = set()

    def artifact(ref, within):
        if not isinstance(ref, dict) or set(ref) - {"path", "sha256", "run", "character", "ascension", "offset", "length"} or not SHA.fullmatch(ref.get("sha256", "")):
            raise ValueError("invalid evidence reference")
        if ("offset" in ref) != ("length" in ref):
            raise ValueError("evidence byte range requires offset and length")
        data = checked_file(within, ref["path"], offset=ref.get("offset", 0), length=ref.get("length"))
        if sha(data) != ref["sha256"]:
            raise ValueError("evidence hash mismatch")
        if ref.get("character", body["character"]) != body["character"]:
            raise ValueError("evidence character mismatch")
        if "run" in ref:
            row = run_rows.get(ref["run"])
            if row is None or "ascension" in ref and ref["ascension"] != row.get("ascension"):
                raise ValueError("evidence run/ascension mismatch")
            evidence_runs.add(ref["run"])
        objects[ref["sha256"]] = data

    artifact(body["report"], allowed)
    if Path(body["report"]["path"]) != Path(report.get("report", "")):
        raise ValueError("original report mismatch")
    records = body["records"]
    if not isinstance(records, list) or not 1 <= len(records) <= 10000:
        raise ValueError("missing/bounded operational records")
    seen = set()
    for record in records:
        if (not isinstance(record, dict) or set(record) != {"id", "kind", "payload", "evidence"}
                or not ID.fullmatch(record.get("id", "")) or record["id"] in seen or record["kind"] not in KINDS
                or not isinstance(record["payload"], dict) or not isinstance(record["evidence"], list) or not record["evidence"]):
            raise ValueError("invalid operational record")
        seen.add(record["id"])
        # Payloads are archival JSON. No interpreter, rule loader or brain tool reads them.
        for ref in record["evidence"]:
            artifact(ref, root)
        if rebased:
            for name in ("knowledge_inputs", "method_inputs"):
                for path, digest in record["payload"].get(name, {}).items():
                    artifact(dict(path=path, sha256=digest), root)
    if set(body["runs"]) - evidence_runs:
        raise ValueError("dispatched runs missing explicit evidence references")
    if not engineering:
        if git(tree, "rev-parse", "HEAD") != head or git(tree, "status", "--porcelain", "--untracked-files=all", "--", *guarded, *exclusions):
            raise ValueError("source base or guarded workspace changed during candidate revalidation")
        if rebased and revalidation is not None:
            revalidation.update(rebased)
    return chosen, body, objects, engineering


def complete(batch_id, batch, report, rc, root, enqueue, inbox):
    if not report.get("operational_candidate"):
        return False
    store = None
    submission = None
    try:
        chosen = selection(root, batch)
        database = Path(chosen["directory"]) / "learning.sqlite"
        if not database.is_file() or database.is_symlink():
            raise ValueError("original operational database unavailable; do not recreate completion")
        store = Store(chosen["directory"])
        tree = Path(batch.get("worktree") or root).resolve()
        raw = checked_file(tree / "learner/runs", report["operational_candidate"])
        submission = store.submit_raw(batch_id, batch.get("learner_task", batch.get("task", "postmortem")), batch["character"], raw)
        receipt = store.completion(batch_id)
        if receipt:
            # Already committed objects are authoritative when live log streams
            # grow or source HEAD advances after publication. Never re-import.
            body = json.loads(raw)
            if rc != 0 or sha(packed(body).encode()) != receipt["digest"] or body.get("id") != batch_id or body.get("character") != batch["character"]:
                raise ValueError("completed operational ID/content conflict")
            store.report(batch_id)
            engineering = receipt.get("engineering_required", False) or any(report.get(k) for k in ("commit", "merged", "fixes", "source_commit", "implementation_domains"))
        else:
            revalidation = {}
            chosen, body, objects, engineering = validate(root, batch_id, batch, report, rc, revalidation=revalidation)
            if packed(body) != packed(json.loads(raw)):
                raise ValueError("candidate changed during validation")
            receipt = store.complete(body, objects, engineering, source_revalidation=revalidation or None)
        if body["task"] == "silent-boss-calibration":
            data_result = store.data_receipt(batch_id + ":calibration")
            if not data_result:
                raise ValueError("calibration has no successful fixed-producer receipt")
            batch["fixed_data_publication"] = data_result
        store.submission_state(batch_id, submission, "published")
        previous = batch.get("operational_publication")
        batch["operational_publication"] = receipt
        batch.pop("operational_pending", None)
        if not engineering:
            batch.update(state="done", rc=rc, report=report, checks_pending=False)
            if body["task"] == "postmortem":
                batch.update(done=body["runs"], missing=[])
        if not previous:
            enqueue("operational-done", f"运营批次 {batch_id} 已入库 {receipt['digest']}；无源码发布/full，原父要求/提案/通知继续，未标知识shipped或收益。")
        if any(report.get(key) for key in ("bugs", "questions", "disagreements", "needs_decision")):
            inbox(f"运营批次 {batch_id} 已留存，存在异常/异议/待决项，沿原owner通知；不代ACK或关闭父项。")
        return not engineering and not report.get("knowledge_candidate")
    except (OSError, ValueError, TypeError, KeyError, sqlite3.Error, subprocess.SubprocessError) as error:
        if store and submission:
            try:
                store.submission_state(batch_id, submission, "pending", type(error).__name__ + ": " + str(error)[:300])
            except (OSError, sqlite3.Error):
                pass  # The original file remains the fallback when storage itself is unavailable.
        batch.update(state="awaiting_review", rc=rc, report=report, operational_pending=True)
        batch.setdefault("operational_attempts", []).append({"error": type(error).__name__, "reason": str(error)[:300]})
        inbox(f"运营批次 {batch_id} 验证/事务待核：{type(error).__name__}；保留原件、原合同与ID，recheck不重学。")
        return True
    finally:
        if store:
            store.close()


def recorded_runs(root, state_dir, character):
    root = Path(root).resolve()
    state_dir = Path(state_dir or os.environ.get("CODEX_OPS_DIR") or root / "ops/codex-ops")
    chosen = capture(root, state_dir, "postmortem")
    directories = set(chosen.get("read_directories", []))
    original_directories = set(read_directories(root, state_dir))
    result = set()
    for directory in directories:
        if not Path(directory, "learning.sqlite").exists():
            if directory in original_directories:
                raise ValueError("original operational records unavailable; do not repeat learning")
            continue
        store = Store(directory, readonly=True)
        try:
            result.update(store.run_ids(character))
        finally:
            store.close()
    return result


def complete_products(batch_id, batch, report, rc, root, enqueue, inbox):
    """Split independently usable records/knowledge from an actual code delivery.

    The running K1 publisher still validates with its installed capabilities.
    Stripping source flags only affects the sub-product report, never the source
    completion, original report or engineering checks.
    """
    if complete(batch_id, batch, report, rc, root, enqueue, inbox):
        return True
    engineering = any(report.get(k) for k in ("commit", "merged", "fixes", "source_commit", "implementation_domains"))
    if not report.get("knowledge_candidate") or not engineering:
        return False
    try:
        selection(root, batch)
    except (ValueError, KeyError, TypeError):
        batch.update(state="awaiting_review", rc=rc, report=report, knowledge_pending=True)
        inbox(f"混合批次 {batch_id} 没有原派发的产物拆分合同；保留旧合同，不热转换在途批次。")
        return True
    if report.get("knowledge_independent") is not True:
        batch.update(state="awaiting_review", rc=rc, report=report, knowledge_pending=True)
        inbox(f"混合批次 {batch_id} 尚未声明可独立由现有消费者读取的知识；原产物/代码保留，不提前激活依赖新能力的内容。")
        return True
    from proposal_dispatch import links
    errors = links(report, batch, str(root), str(Path(root) / "ops"))
    if errors:
        batch.update(state="awaiting_review", rc=rc, report=report, knowledge_pending=True, proposal_audit_errors=errors)
        inbox(f"混合批次 {batch_id} 原提案链未通过；不激活知识，原代码/候选保留。")
        return True
    subreport = {**report, "commit": None, "merged": None, "fixes": [], "source_commit": None, "implementation_domains": []}
    product = copy.deepcopy(batch)
    from knowledge_runtime import complete as complete_knowledge
    complete_knowledge(batch_id, product, subreport, rc, root, enqueue, inbox, independent=True)
    for key in ("knowledge_publication", "knowledge_attempts", "knowledge_pending", "external_result", "external_output_files", "backfill_result", "backfill_output_files"):
        if key in product:
            batch[key] = product[key]
        else:
            batch.pop(key, None)
    if product.get("state") != "done":
        batch.update(state="awaiting_review", rc=rc, report=report)
        return True
    batch["knowledge_independent_consumed"] = True
    return False


def fixed_calibration_tree_available(root, worktree, batches, alive):
    """Admit only a verified fixed-data compatibility delta, never dirty source.

    This does not retire an owner, delete a tree or release an active wrapper.
    Legacy failures without a runtime receipt keep the original tree gate.
    """
    tree = Path(worktree)
    if (tree.parent != Path(root).resolve() / ".worktrees" or tree.name != "silent-boss-calibration" or tree.resolve() != tree
            or not (tree / ".git").is_file() or (tree / ".git").is_symlink()):
        return False
    owned = [b for b in batches.values() if b.get("worktree") == str(tree)]
    if any(alive(b.get("pid")) or b.get("state") in ("running", "launching", "awaiting_review") for b in owned):
        return False
    prior = next((b for b in reversed(owned) if b.get("learner_task") == "silent-boss-calibration"
                  and b.get("state") == "done" and b.get("rc") == 0 and b.get("fixed_data_publication")), None)
    if not prior or type(prior.get("pid")) is not int or prior["pid"] <= 0 or prior.get("proposal_audit_errors") or prior.get("proposal_repair_needed") or prior.get("checks_pending"):
        return False
    store = None
    try:
        chosen = selection(root, prior)
        store = Store(chosen["directory"], readonly=True)
        receipt = prior["fixed_data_publication"]
        if store.data_receipt(receipt["request"]) != receipt:
            return False
        name = "characters/silent/boss-trust.json"
        expected = store.manifest(receipt["version"])[name]
        if sha(checked_file(tree / "knowledge", tree / "knowledge" / name)) != expected:
            return False
        if subprocess.run(["git", "-C", str(tree), "diff", "--cached", "--quiet"], timeout=20).returncode:
            return False
        dirty = git(tree, "status", "--porcelain", "--untracked-files=all", "--", ".", ":(exclude)knowledge/" + name)
        return not dirty and git(tree, "rev-parse", "HEAD") == prior.get("report", {}).get("base")
    except (OSError, ValueError, KeyError, TypeError, sqlite3.Error, subprocess.SubprocessError):
        return False
    finally:
        if store:
            store.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["init", "query", "status", "report", "fixed-current", "export", "backup", "restore", "rollback", "bind", "launch"])
    parser.add_argument("--runtime", required=True)
    parser.add_argument("--id")
    parser.add_argument("--character")
    parser.add_argument("--kind")
    parser.add_argument("--destination")
    parser.add_argument("--version")
    parser.add_argument("--request")
    parser.add_argument("--run")
    parser.add_argument("--code")
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--offset", type=int, default=0)
    args, child = parser.parse_known_args()
    if args.command == "restore":
        store = Store.restore(args.destination, args.runtime)
    else:
        store = Store(args.runtime, readonly=args.command in ("query", "status", "report", "fixed-current", "export", "backup"))
    try:
        if args.command == "init":
            result = {"schema": "operational-runtime-v1", "version": store.current()}
        elif args.command == "status":
            result = {"completion": store.completion(args.id), "submissions": store.submission_history(args.id)}
        elif args.command == "fixed-current":
            version = store.current()
            result = {"version": version, "snapshot": store.snapshot(version) if version else None}
        elif args.command == "report":
            destination = Path(args.destination)
            if destination.exists():
                raise ValueError("report destination exists")
            raw = store.report(args.id)
            atomic(destination, raw)
            result = {"id": args.id, "report_sha256": sha(raw)}
        elif args.command in ("query", "export"):
            result = store.records(args.character, args.kind, args.limit, args.offset, args.run)
            if args.command == "export":
                destination = Path(args.destination)
                if destination.exists():
                    raise ValueError("export destination exists")
                atomic(destination, (packed(result) + "\n").encode())
        elif args.command == "backup":
            store.backup(args.destination)
            result = {"backup": True}
        elif args.command == "rollback":
            result = {"version": store.rollback(args.version, args.request)}
        elif args.command in ("bind", "launch"):
            result = store.bind(args.run, args.code)
            if args.command == "launch":
                if not child or child[0] != "--" or len(child) < 2:
                    raise ValueError("launch requires -- command")
                dependencies = store.knowledge_dependencies(result["version"], result["managed_paths"])
                store.close()
                store = None
                os.execvpe(child[1], child[1:], {**os.environ, "STS2_DATA_VERSION": result["version"], "STS2_DATA_SNAPSHOT": result["snapshot"],
                                              "STS2_DATA_RUNTIME": str(Path(args.runtime).resolve()), "STS2_DATA_RUN_KEY": result["run"],
                                              "STS2_DATA_MANAGED_PATHS": packed(result["managed_paths"]),
                                              "STS2_DATA_KNOWLEDGE_DEPENDENCIES": packed(dependencies)})
        else:
            result = {"restored": True, "version": store.current()}
        print(packed(result))
    finally:
        if store:
            store.close()


if __name__ == "__main__":
    main()
