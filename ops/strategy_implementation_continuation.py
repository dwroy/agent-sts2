"""Frozen continuation inputs and owner checks for the existing implementation writer."""
import json
import os
from pathlib import Path
import time

ID = "ops-20261012-quantitative-continuation"
PATH = "notes/core-cycle-quantitative-continuation-request.json"
DIRECTORY = "paper/materials/20261012-0111-codex1-resumed/"
PRIOR = "20261011-221722-strategy-proposal"
TASK_SHA = "b469d73abae606c55a3ca4252210f4574c55bffdbd303fb2bb76a0ac213d26a4"
ADDENDUM_SHA = "e2f593c68d1d00ca1c33aac7d4971603ce349a22a93eaafe0e6d6cd1e6d1efa5"


def read(root):
    import strategy_implementation_jobs as implementation
    artifact, digest = implementation.artifact, implementation.digest
    parent, parent_raw, binding, task, authorization = implementation.read_request(root)
    raw = artifact(root, PATH)
    request = json.loads(raw)
    expected = {"request_id": ID, "parent_request_id": implementation.REQUEST, "prior_batch": PRIOR,
                "task": DIRECTORY + "quantitative-continuation-task.md", "task_sha256": TASK_SHA,
                "ownership_addendum": DIRECTORY + "quantitative-ownership-addendum.json",
                "old_registration_modified": False, "final_delivery_complete": False}
    if not isinstance(request, dict) or any(request.get(k) != v for k, v in expected.items()):
        raise ValueError("continuation request identity mismatch")
    continuation_task = artifact(root, request["task"], TASK_SHA)
    addendum_raw = artifact(root, request["ownership_addendum"], ADDENDUM_SHA)
    addendum = json.loads(addendum_raw)
    if (addendum.get("parent_request_id") != implementation.REQUEST or addendum.get("prior_batch") != PRIOR
            or addendum.get("original_ack_modified") is not False
            or addendum.get("original_ack_sha256") != binding["ack_sha256"]
            or addendum.get("released_to_original_implementation_successor") != implementation.WATCHER_FILES):
        raise ValueError("continuation ownership or original ACK mismatch")
    receipts = parent.get("actual_batches", [])
    if (len(receipts) != 1 or receipts[0].get("batch") != PRIOR
            or receipts[0].get("status") != "running_bound"
            or any(receipts[0].get("binding", {}).get(k) != v for k, v in binding.items())):
        raise ValueError("continuation original registration mismatch")
    artifacts = addendum.get("artifact_checks")
    if not isinstance(artifacts, list) or not artifacts or len({row["path"] for row in artifacts}) != len(artifacts):
        raise ValueError("continuation artifact inventory missing or duplicated")
    prior_tree = str(Path(root).resolve() / ".worktrees" / ("codex-strategy-silent-" + PRIOR[:15]))
    for row in artifacts:
        if (row.get("matches") is not True or
                not (Path(root) / row["path"]).resolve().is_relative_to(Path(prior_tree) / "learner/runs")):
            raise ValueError("continuation artifact does not belong to the original owner")
        artifact(root, row["path"], row["sha256"])
    supplement = {"id": ID, "prior_batch": PRIOR, "task_sha256": TASK_SHA,
                  "ownership_addendum_sha256": ADDENDUM_SHA, "parent_request_sha256": digest(parent_raw),
                  "prior_binding": receipts[0]["binding"], "prior_receipt": receipts[0], "artifacts": artifacts,
                  "released_paths": implementation.WATCHER_FILES}
    binding = {**binding, "continuation": supplement}
    task += ("\n\n## 原实现的有界续办（本补充优先于旧职责保留）\n"
             "保留父请求、旧批次及提案 waiting 历史；复用下列已核产物，不重新研究。\n"
             "最终 JSON 增加 continuation_id=" + ID + " 与 continuation_input_sha256=" + ADDENDUM_SHA
             + "，request_id 仍为原父请求。\n").encode()
    task += continuation_task + b"\n\n" + addendum_raw
    return request, raw, binding, task, authorization


def owner_alive(pid):
    if not isinstance(pid, int) or pid <= 0:
        return True
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True


def owners(state, binding, alive, current=None):
    import strategy_implementation_jobs as implementation
    prior = state["batches"].get(PRIOR, {})
    if (prior.get("state") != "done" or prior.get("implementation_request") != implementation.REQUEST
            or prior.get("proposal_ids") != implementation.PROPOSALS
            or prior.get("implementation_binding") != binding["continuation"]["prior_binding"]
            or prior.get("implementation_dispatch_receipt") != binding["continuation"]["prior_receipt"]
            or any(prior.get(key) != binding["continuation"]["prior_receipt"].get(key)
                   for key in ("pid", "worktree", "pane"))
            or alive(prior.get("pid"))):
        raise ValueError("continuation original owner has not exited or its binding changed")
    for ident, batch in state["batches"].items():
        if ident in (PRIOR, current) or not set(batch.get("proposal_ids", [])) & set(implementation.PROPOSALS):
            continue
        if batch.get("state") not in ("done", "failed") or alive(batch.get("pid")):
            raise ValueError("continuation proposal lease conflict")


def registered(state, request, binding, alive):
    previous = [(ident, batch) for ident, batch in state["batches"].items()
                if batch.get("implementation_request") == ID]
    receipts = request.get("actual_batches", [])
    if len(receipts) != len(previous) or any(
            not any(row.get("batch") == ident and row == batch.get("implementation_dispatch_receipt") for row in receipts)
            for ident, batch in previous):
        raise ValueError("continuation history mismatch; preserve failed registration")
    last_id, last = previous[-1] if previous else (None, {})
    owners(state, binding, alive, current=last_id)
    if previous and last.get("implementation_binding", {}).get("continuation") != binding["continuation"]:
        raise ValueError("continuation frozen inputs changed")
    if last.get("state") in ("running", "done"):
        return last_id, last["pid"]
    if previous:
        if (last.get("state") != "failed" or alive(last.get("pid")) or len(previous) >= 3
                or not isinstance(last.get("retry_at"), (float, int)) or last["retry_at"] > time.time()):
            raise ValueError("continuation retry is cooling down, exhausted or has an unclosed owner")
    elif request.get("state") != "queued_for_existing_ordinary_fix" or request.get("actual_batch") is not None:
        raise ValueError("continuation is not queued")
    return None
