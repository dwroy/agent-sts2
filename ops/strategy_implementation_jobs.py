"""Bind an explicitly requested implementation to the existing strategy writer.

Dispatch and host registration run under learn.lock. No automatic polling route,
new proposal identities, or gameplay claims are introduced here.
"""
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time

from strategy_research_jobs import atomic_json, digest

REQUEST = "roy-20261011-silent-core-cycle-quantitative-learning"
REQUEST_PATH = "notes/core-cycle-quantitative-learning-request.json"
DIRECTORY = "paper/materials/silent/20261011-core-cycle-quantitative-learning/"
TASK_SHA = "3c9355afd6ee7c98ff7cfc9c2e9a45d20fdf025ae701fccd482b1b73aea6079b"
MANIFEST_SHA = "54bd743de00cc1c5146546f06859a59016afba85a39c52aa73359860359c845f"
AUTH_SHA = "b998719e1bc75c0b2af67b1fcd862c6bffc4b7707b825e83b58ecf79cd1c1508"
PROPOSALS = ["silent-proposal-9e1bc1225fae0e30", "silent-proposal-3dae3ca702a14057",
             "silent-proposal-9e81dc5f9a4c3bd5"]
WATCHER_FILES = ["agent/src/sim/quantitative-stats.ts", "agent/src/sim/quantitative-facts.ts",
                 "agent/src/sim/quantitative-calibration.ts", "agent/src/sim/build-sim.ts",
                 "agent/src/sim/build-sim-facts.ts", "agent/src/reflex/combat-plan.ts"]


def artifact(root, relative, expected=None):
    project = Path(root).resolve()
    if not isinstance(relative, str) or Path(relative).is_absolute():
        raise ValueError("invalid implementation input path")
    path = (project / relative).resolve()
    if not path.is_relative_to(project):
        raise ValueError("implementation input outside project")
    raw = path.read_bytes()
    if expected is not None and (not re.fullmatch(r"[0-9a-f]{64}", str(expected)) or digest(raw) != expected):
        raise ValueError("implementation input SHA mismatch: " + relative)
    return raw


def read_request(root):
    raw = artifact(root, REQUEST_PATH)
    request = json.loads(raw)
    expected = {"request_id": REQUEST, "authorized_by": "Roy", "character": "silent",
                "kind": "ops_learning_handoff", "parent_completion_preserved": True,
                "parent_request_id": "roy-20261010-silent-core-reuse-experience-integration",
                "work_spec": DIRECTORY + "task.md", "work_spec_sha256": TASK_SHA,
                "input_manifest": DIRECTORY + "input-manifest.json", "input_manifest_sha256": MANIFEST_SHA,
                "linked_code_proposals": PROPOSALS}
    if not isinstance(request, dict) or any(request.get(k) != v for k, v in expected.items()):
        raise ValueError("implementation request identity mismatch")
    task = artifact(root, request["work_spec"], TASK_SHA)
    manifest = json.loads(artifact(root, request["input_manifest"], MANIFEST_SHA))
    if (manifest.get("request_id") != REQUEST or manifest.get("character") != "silent"
            or not isinstance(manifest.get("files"), list) or len(manifest["files"]) != 9):
        raise ValueError("implementation manifest identity mismatch")
    files = manifest["files"]
    if len({row["path"] for row in files}) != 9:
        raise ValueError("duplicate implementation inputs")
    for row in files:
        content = artifact(root, row["path"], row["sha256"])
        if len(content) != row["bytes"]:
            raise ValueError("implementation input size mismatch")
    authorization = artifact(root, DIRECTORY + "authorization-upgrade-20261011.md", AUTH_SHA)
    ack_raw = artifact(root, DIRECTORY + "ops-ack.json")
    ack = json.loads(ack_raw)
    if (ack.get("request_id") != REQUEST or ack.get("file_responsibilities", {}).get("watcher") != WATCHER_FILES
            or ack.get("frozen_task") != {"path": request["work_spec"], "sha256": TASK_SHA}
            or ack.get("input_manifest", {}).get("sha256") != MANIFEST_SHA
            or {p.get("id") for p in ack.get("proposal_deduplication", [])} != set(PROPOSALS)
            or {"path": DIRECTORY + "authorization-upgrade-20261011.md", "sha256": AUTH_SHA,
                "immutable": True} not in ack.get("supplemental_inputs", [])):
        raise ValueError("implementation authorization or file ownership mismatch")
    proposal_hashes = {p["id"]: p.get("proposal_sha256") for p in ack["proposal_deduplication"]}
    if any(proposal_hashes[ident] != row["sha256"] for ident, row in zip(PROPOSALS, files[-3:])):
        raise ValueError("proposal identities differ from frozen originals")
    binding = {"request_id": REQUEST, "work_spec_sha256": TASK_SHA, "input_manifest_sha256": MANIFEST_SHA,
               "authorization_sha256": AUTH_SHA, "ack_sha256": digest(ack_raw),
               "files": files, "file_responsibilities": ack["file_responsibilities"]}
    return request, raw, binding, task, authorization


def proposal_inputs(root, scripts):
    from proposal_dispatch import library
    lib = library(scripts)
    items = lib.fold(Path(root, lib.QUEUE))
    evidence = []
    identity = []
    ack = json.loads(artifact(root, DIRECTORY + "ops-ack.json"))
    expected = {p["id"]: p["proposal_sha256"] for p in ack["proposal_deduplication"]}
    for ident in PROPOSALS:
        item = items.get(ident, {})
        if (item.get("character") != "silent" or item.get("target_task") != "strategy-proposal"
                or item.get("state") != "pending" or item.get("proposal_sha256") != expected[ident]):
            raise ValueError("original implementation proposal is unavailable: " + ident)
        path = Path(item.get("proposal", "")).resolve()
        if not path.is_relative_to(Path(root).resolve()) or digest(path.read_bytes()) != expected[ident]:
            raise ValueError("original implementation proposal SHA mismatch")
        runs = item.get("runs")
        if (not isinstance(runs, list) or not runs or any(not isinstance(run, str) or
                not re.fullmatch(r"[A-Z0-9]{12}", run) for run in runs)):
            raise ValueError("invalid implementation evidence runs")
        evidence.extend(runs)
        identity.append({"id": ident, "proposal": str(path), "proposal_sha256": expected[ident]})
    evidence = list(dict.fromkeys(evidence))[:10]
    # The normal writer requires ended evidence from the same character.
    known = set()
    with Path(root, "logs/runs.jsonl").open() as handle:
        for line in handle:
            row = json.loads(line)
            if str(row.get("character", "ironclad")).lower() == "silent":
                known.add(row.get("run_id"))
    if not set(evidence) <= known:
        raise ValueError("implementation evidence is not an ended Silent run")
    return evidence, identity


def dispatch(state, root, scripts, character, alive, stamp, dispatch_write, ident):
    if ident != REQUEST or character != "silent" or not re.fullmatch(r"[0-9]{8}-[0-9]{6}", stamp):
        raise ValueError("unknown implementation request")
    # A lost owner's unclosed lease is still a conflict. Recovery belongs to ops.
    if any(b.get("implementation_request") == ident or
           b.get("state") == "running" and set(b.get("proposal_ids", [])) & set(PROPOSALS)
           for b in state["batches"].values()):
        raise ValueError("implementation request already registered or proposals leased")
    request, raw, binding, _, _ = read_request(root)
    if request.get("state") != "queued_for_ops" or request.get("actual_batches") != []:
        raise ValueError("implementation request is not awaiting its first dispatch")
    evidence, identities = proposal_inputs(root, scripts)
    base = subprocess.check_output(["git", "-C", str(root), "rev-parse", "main"], text=True).strip()
    if not re.fullmatch(r"[0-9a-f]{40}", base):
        raise ValueError("invalid implementation dispatch baseline")
    binding.update(dispatch_base=base, proposals=identities)
    state_dir = Path(os.environ.get("CODEX_OPS_DIR") or Path(root, "ops/codex-ops"))
    history = state_dir / "strategy-implementation-history"
    history.mkdir(parents=True, exist_ok=True)
    snapshot = history / (digest(raw) + ".request.json")
    if not snapshot.exists():
        snapshot.write_bytes(raw)
    launched = dispatch_write(state, root, scripts, "strategy-proposal", character, evidence,
                              "strategy-implementation:" + ident, "ops", alive, stamp,
                              implementation_request=ident)
    if launched is None:
        return None
    batch_id, pid = launched
    batch = state["batches"][batch_id]
    batch.update(proposal_ids=list(PROPOSALS), implementation_binding=binding)
    receipt = {"request_id": ident, "batch": batch_id, "pid": pid, "worktree": batch["worktree"],
               "pane": batch.get("pane"), "at": time.time(), "binding": binding, "status": "binding_failed"}
    try:
        current, current_raw, current_binding, _, _ = read_request(root)
        if current_raw != raw or any(current_binding[k] != binding[k] for k in current_binding):
            raise ValueError("implementation request changed during dispatch")
        if (batch.get("implementation_request") != ident or batch_id != stamp + "-strategy-proposal"
                or batch.get("worktree") != str(Path(root).resolve() / ".worktrees" / ("codex-strategy-silent-" + stamp))):
            raise ValueError("actual implementation batch identity mismatch")
        receipt["status"] = "running_bound"
        atomic_json(Path(root, REQUEST_PATH), {**current, "state": "running", "actual_batches": [receipt]})
    except (OSError, ValueError, KeyError, TypeError) as error:
        receipt.update(status="binding_failed", error=str(error))
        batch["implementation_binding_error"] = str(error)
    batch["implementation_dispatch_receipt"] = receipt
    try:
        atomic_json(history / (batch_id + ".json"), receipt)
    except OSError as error:
        batch["implementation_binding_error"] = str(error)
    return launched


def bound_batch(root, state_dir, batch_id, character, worktree, ident):
    if ident != REQUEST or character != "silent" or not re.fullmatch(r"[0-9]{8}-[0-9]{6}-strategy-proposal", batch_id):
        raise ValueError("implementation registration identity mismatch")
    tree = str(Path(root).resolve() / ".worktrees" / ("codex-strategy-silent-" + batch_id[:15]))
    batch = json.loads(Path(state_dir, "learn.json").read_bytes()).get("batches", {}).get(batch_id, {})
    expected = {"task": "strategy-proposal", "character": character, "reason": "ops", "worktree": tree,
                "implementation_request": ident, "key": "strategy-implementation:" + ident,
                "proposal_ids": PROPOSALS}
    if (worktree != tree or any(batch.get(k) != v for k, v in expected.items())
            or "research_request" in batch or "proposal_repair" in batch):
        raise ValueError("implementation registration not saved")
    return batch


def ready(root, state_dir, batch_id, character, worktree, ident):
    batch = bound_batch(root, state_dir, batch_id, character, worktree, ident)
    request, _, binding, _, _ = read_request(root)
    if batch.get("state") != "running" or batch.get("implementation_binding_error") or request.get("state") != "running":
        raise ValueError("implementation registration is not running")
    stored = batch.get("implementation_binding", {})
    if any(stored.get(k) != v for k, v in binding.items()):
        raise ValueError("implementation registration binding changed")
    receipts = request.get("actual_batches", [])
    if len(receipts) != 1 or any(receipts[0].get(k) != v for k, v in {
            "batch": batch_id, "worktree": worktree, "pid": batch.get("pid"), "pane": batch.get("pane"),
            "binding": stored, "status": "running_bound"}.items()):
        raise ValueError("implementation request is not bound to this host batch")
    evidence, identities = proposal_inputs(root, Path(__file__).parent)
    if batch.get("runs") != evidence or stored.get("proposals") != identities:
        raise ValueError("implementation proposals changed before model start")
    state = json.loads(Path(state_dir, "learn.json").read_bytes())
    if any(key != batch_id and value.get("state") == "running" and
           set(value.get("proposal_ids", [])) & set(PROPOSALS) for key, value in state["batches"].items()):
        raise ValueError("implementation proposal lease conflict")
    base = stored.get("dispatch_base", "")
    if not re.fullmatch(r"[0-9a-f]{40}", base) or subprocess.run(
            ["git", "-C", root, "cat-file", "-e", base + "^{commit}"], capture_output=True).returncode:
        raise ValueError("implementation dispatch commit missing")
    return batch


def prepare(root, state_dir, batch_id, character, worktree, ident):
    batch = ready(root, state_dir, batch_id, character, worktree, ident)
    _, _, binding, task, authorization = read_request(root)
    head = subprocess.check_output(["git", "-C", worktree, "rev-parse", "HEAD"], text=True).strip()
    if head != batch["implementation_binding"]["dispatch_base"]:
        raise ValueError("implementation worktree differs from registered baseline")
    template = Path(worktree, "learner/tasks/strategy-proposal.md").read_text()
    # Escape only template delimiter spelling; the exact immutable bytes remain in
    # the source artifacts and their hashes in the receipt.
    appendix = ("\n\n## 本批宿主已绑定的实现请求（优先于纯研究章节）\n"
                + json.dumps({**binding, "batch": batch_id, "worktree": worktree,
                              "proposal_ids": PROPOSALS}, ensure_ascii=False, indent=2)
                + "\n\n" + task.decode() + "\n\n" + authorization.decode())
    if "{{" in appendix or "}}" in appendix:
        raise ValueError("frozen implementation text contains template delimiters")
    destination = Path(state_dir, "learner", batch_id + ".implementation-input", "strategy-proposal.md")
    destination.parent.mkdir(parents=True, exist_ok=True)
    prompt_source = (template + appendix).encode()
    if destination.exists() and destination.read_bytes() != prompt_source:
        raise ValueError("preserved implementation model input differs")
    destination.write_bytes(prompt_source)
    receipt = {"request_id": ident, "batch": batch_id, "worktree": worktree,
               "status": "input_prepared", "at": time.time(), "binding": batch["implementation_binding"],
               "task_path": str(destination), "task_sha256": digest(prompt_source),
               "model_delivery": "pending; actual prompt is recorded by learner_launch"}
    atomic_json(Path(state_dir, "learner", batch_id + ".implementation-input.json"), receipt)
    return str(destination)


def report_errors(report, batch, root):
    if not batch.get("implementation_request"):
        return []
    binding = batch.get("implementation_binding", {})
    expected = {"task": "strategy-proposal", "character": "silent", "request_id": REQUEST,
                "batch": Path(batch.get("worktree", "")).name.removeprefix("codex-strategy-silent-") + "-strategy-proposal",
                "input_sha256": binding.get("input_manifest_sha256"),
                "work_spec_sha256": binding.get("work_spec_sha256")}
    if (batch.get("implementation_binding_error") or "research_request" in batch
            or report.get("research_complete") is not None or batch.get("proposal_ids") != PROPOSALS
            or any(report.get(k) != v for k, v in expected.items())):
        return ["implementation completion identity or input binding mismatch"]
    try:
        state_dir = Path(os.environ.get("CODEX_OPS_DIR") or Path(root, "ops/codex-ops"))
        directory = state_dir / "learner"
        receipt = json.loads((directory / (expected["batch"] + ".implementation-input.json")).read_bytes())
        task_path = directory / (expected["batch"] + ".implementation-input") / "strategy-proposal.md"
        if (receipt.get("status") != "input_prepared" or receipt.get("binding") != binding
                or receipt.get("request_id") != REQUEST or receipt.get("batch") != expected["batch"]
                or receipt.get("worktree") != batch.get("worktree") or receipt.get("task_path") != str(task_path)
                or receipt.get("task_sha256") != digest(task_path.read_bytes())):
            raise ValueError("prepared input receipt mismatch")
    except (OSError, ValueError, TypeError):
        return ["implementation completion lacks its preserved host input"]
    return []


def main():
    if len(sys.argv) != 8 or sys.argv[1] not in ("ready", "registered", "prepare"):
        return 2
    action = sys.argv[1]
    args = sys.argv[2:]
    try:
        if action == "registered":
            bound_batch(*args)
        elif action == "prepare":
            print(prepare(*args))
        else:
            batch = ready(*args)
            atomic_json(Path(args[1], "learner", args[2] + ".implementation-registration.json"),
                        {"request_id": REQUEST, "batch": args[2], "worktree": args[4], "at": time.time(),
                         "status": "registered_bound", "binding": batch["implementation_binding"]})
            print(batch["implementation_binding"]["dispatch_base"])
        return 0
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
        sys.stderr.write("implementation binding rejected: " + str(error) + "\n")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
