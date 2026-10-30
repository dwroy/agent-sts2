"""Read-only ordinary compute admission, independent of task/review completion."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
from types import SimpleNamespace


def process_birth(pid):
    """Missing/zombie is stopped; unreadable process identity is never stopped."""
    if type(pid) is not int or pid <= 1:
        raise ValueError("invalid process identity")
    try:
        fields = Path(f"/proc/{pid}/stat").read_text().rsplit(")", 1)[1].split()
        return None if fields[0] in ("Z", "X") else fields[19]
    except FileNotFoundError:
        return None


def read_json(path):
    from learner_tabs import read_regular
    raw, _ = read_regular(Path(path))
    return json.loads(raw), hashlib.sha256(raw).hexdigest()


def native_terminal(receipt, raw):
    """Prove the bound turn ended, including aborts; do not judge task success."""
    from learner_tui import reconstruct_native
    if receipt.get("submitted") is not True or len(raw) > 64 * 1024 * 1024 or not raw.endswith(b"\n"):
        raise ValueError("native terminal snapshot incomplete")
    # Reconstruct the journaled prompt and native environment in memory. Unlike
    # finish recovery, admission does not require a successful final report.
    reconstruct_native(receipt, source=io.StringIO(raw.decode()))
    closed = False
    for line in raw.splitlines():
        event = json.loads(line)
        payload = event.get("payload", {})
        if event.get("type") == "event_msg":
            if payload.get("type") == "task_started":
                closed = False
            elif payload.get("type") in ("task_complete", "turn_aborted"):
                closed = payload.get("turn_id") == receipt.get("turn")
    if not closed:
        raise ValueError("original bound turn is still open")


def inactive_workspace(root, directory, batch, row, receipt):
    """Reuse the original host/pane/input/process guards without retirement actions."""
    import issue_session
    from issue_session_support import load, require_host_process_view, safe_path
    from learner_tabs import LearnerTabs, IDENTITY
    require_host_process_view()
    tabs = LearnerTabs(root, directory, dry=True)
    label = receipt["label"]
    host = load(tabs.host)
    if any(other != batch and value.get("pane") == row.get("pane")
           for other, value in load(tabs.state)["batches"].items()):
        raise ValueError("ambiguous pane owner")
    expected = receipt.get("identity", {})
    if any(not isinstance(expected.get(k), str) or not expected[k] for k in IDENTITY):
        raise ValueError("original pane identity missing")

    def pane_absent():
        workspaces = tabs.herdr("workspace", "list")["workspaces"]
        if not any(w.get("workspace_id") == expected["workspace_id"] for w in workspaces):
            return True
        panes = tabs.herdr("pane", "list", "--workspace", expected["workspace_id"])["panes"]
        # A changed pane/tab/terminal identity is not evidence of absence.
        return not any(any(p.get(k) == expected[k] for k in ("pane_id", "tab_id", "terminal_id")) for p in panes)

    absent = pane_absent()
    if absent:
        identity = {k: expected[k] for k in IDENTITY} | dict(pane_absent=True)
    else:
        pane = tabs.pane(row, host, label)
        if any(pane.get(k) != expected[k] for k in IDENTITY):
            raise ValueError("original pane identity changed")
        identity = tabs.idle(pane)
    tree = safe_path(root, receipt["cwd"])
    # A shared project cwd cannot attribute detached tests/writers to this batch.
    # Keep it unknown rather than ignoring other jobs or treating them as this owner.
    if tree == root or tree.parent != root / ".worktrees":
        raise ValueError("shared workspace activity cannot be scoped")
    context = SimpleNamespace(root=root, board=tabs.board)
    probe = lambda proc: issue_session.Sessions.process_cwd(context, proc)
    allowed = set() if absent else {identity["shell_pid"]}
    if issue_session.processes(tree, allowed, probe):
        raise ValueError("workspace command/model/test/write process is active")
    if (absent and not pane_absent()) or (not absent and tabs.idle(tabs.pane(row, host, label)) != identity):
        raise ValueError("pane activity changed during admission")
    return identity


def batch_status(batch, row, directory, alive, *, birth=process_birth, activity=inactive_workspace):
    """Release only a bound, stopped owner with verified native and host inactivity."""
    result = dict(batch=batch, task=row.get("task", "postmortem"), state=row.get("state"),
                  pane=row.get("pane"), supervisor=dict(pid=row.get("pid"), birth=None),
                  native=None, occupies=True, reason="owner_evidence_missing")
    stage = "supervisor_identity"
    try:
        if "supervisor_close" in row:
            stage = "supervisor_close"
            from learner_supervisor_close import closed
            if closed(batch, row, directory, birth):
                result.update(occupies=False, reason="supervisor_voided")
                return result
            raise ValueError("supervisor close pointer unverified")
        # Running/launching owners keep the original reservation. Review release
        # is a separate proof, never a rewrite to failed/lost/done or a retry.
        current = birth(row.get("pid"))
        result["supervisor"]["observed_birth"] = current
        if row.get("state") != "awaiting_review":
            result["reason"] = "supervisor_identity_unverified" if current else "owner_state_unresolved"
            return result
        if directory is None:
            return result
        directory = Path(directory).absolute()
        root = directory.parent.parent
        from issue_session_support import safe_path
        from learner_tabs import batch_label, native_evidence
        from learner_tui import REGISTRATION_FIELDS
        if not re.fullmatch(r"[0-9]{8}-[0-9]{6}(?:-(?:s2-)?[a-z-]+)?", batch):
            raise ValueError("invalid batch")
        stage = "deferral_binding"
        path = safe_path(root, directory / "learner" / (batch + ".verification-deferred.json"))
        deferred, deferred_sha = read_json(path)
        supervisor = deferred.get("supervisor", {})
        result["supervisor"]["birth"] = supervisor.get("birth")
        registration = deferred.get("registration", {})
        if (deferred.get("schema") != "learner-verification-deferred-v1" or deferred.get("batch") != batch
                or supervisor.get("pid") != row.get("pid")
                or not isinstance(supervisor.get("birth"), str) or not re.fullmatch(r"[0-9]+", supervisor["birth"])
                or any(registration.get(k) != row.get(k) for k in REGISTRATION_FIELDS)
                or row.get("verification_deferred") != str(path)):
            raise ValueError("deferral binding changed")
        if current is not None or alive(row["pid"]):
            result["reason"] = "supervisor_active" if current == supervisor["birth"] else "supervisor_pid_reused_or_unknown"
            return result
        stage = "native_binding"
        receipt_path = safe_path(root, directory / "learner" / (batch_label(batch, row) + ".tui.json"))
        receipt, receipt_sha = read_json(receipt_path)
        result["native"] = {k: receipt.get(k) for k in ("pid", "birth", "session", "turn")}
        if (receipt.get("label") != batch_label(batch, row) or receipt.get("pane") != row.get("pane")
                or receipt.get("cwd") != (row.get("worktree") or str(root))
                or any(receipt.get("result", {}).get(k) != receipt.get(k) for k in ("session", "turn", "rollout"))
                or not isinstance(receipt.get("birth"), str) or not re.fullmatch(r"[0-9]+", receipt["birth"])):
            raise ValueError("native registration changed")
        current_native = birth(receipt.get("pid"))
        result["native"]["observed_birth"] = current_native
        if current_native is not None or alive(receipt["pid"]):
            result["reason"] = "native_active" if current_native == receipt["birth"] else "native_pid_reused_or_unknown"
            return result
        stage = "native_terminal"
        # Reconstruction validates the original prompt/turn in memory only. It
        # does not authorize finish, repair the report, or replace the rc75 file.
        evidence, raw = native_evidence(root, directory, receipt)
        native_terminal(receipt, raw)
        stage = "workspace_activity"
        identity = activity(root, directory, batch, row, receipt)
        stage = "evidence_changed"
        if (read_json(path)[1] != deferred_sha or read_json(receipt_path)[1] != receipt_sha
                or native_evidence(root, directory, receipt)[0] != evidence
                or birth(row["pid"]) is not None or birth(receipt["pid"]) is not None):
            raise ValueError("owner/evidence changed")
        result.update(occupies=False, reason="verified_inactive_pending_review",
                      evidence=dict(deferral_sha256=deferred_sha, receipt_sha256=receipt_sha,
                                    native_sha256=evidence["sha256"], activity=identity))
    except (OSError, ValueError, KeyError, TypeError, IndexError, AttributeError, UnicodeError, subprocess.SubprocessError) as error:
        # Do not leak native text, command arguments or private error paths.
        reasons = {
            "shared workspace activity cannot be scoped": "shared_workspace_activity_unscoped",
            "workspace command/model/test/write process is active": "workspace_work_active",
            "learner pane has active command": "pane_command_active",
            "learner pane has extra foreground process": "pane_command_active",
            "learner pane has background work": "pane_background_work_active",
            "shell input readiness is unverified": "shell_input_unverified",
            "incomplete host process visibility": "host_process_visibility_unverified",
            "host process visibility required for reclamation": "host_process_visibility_unverified",
        }
        result["reason"] = reasons.get(str(error), stage + "_unverified")
    return result


def snapshot(state, alive, directory=None, **checks):
    blockers, pending, closed = [], [], []
    for batch, row in state["batches"].items():
        if row.get("external_source"):
            continue
        if row.get("state") not in ("running", "launching", "awaiting_review") and not alive(row.get("pid")):
            continue
        entry = batch_status(batch, row, directory, alive, **checks)
        if entry["reason"] == "supervisor_voided":
            closed.append(entry)
            continue
        if row.get("state") == "awaiting_review":
            pending.append(entry)
        if entry["occupies"]:
            blockers.append(entry)
    from ascension_audit import lease_busy
    for key, request in state.get("ascension_audits", {}).items():
        active = request.get("state") in ("running", "launching")
        try:
            locked = bool(directory and type(request.get("level")) is int and request.get("character")
                          and lease_busy(directory, request, create=False))
        except (OSError, ValueError):
            locked = True
        if active or locked:
            blockers.append(dict(request=key, occupies=True, reason="ascension_owner_or_lease", state=request.get("state")))
    return dict(schema="own-learning-slot-v1", busy=bool(blockers), blockers=blockers, pending_review=pending, closed=closed)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path, required=True)
    args = parser.parse_args()
    path = args.directory / "learn.json"
    state, source_sha = read_json(path.absolute())
    # This standalone projection never applies deferrals or saves learn.json.
    result = snapshot(state, lambda pid: process_birth(pid) is not None if type(pid) is int and pid > 1 else False,
                      args.directory)
    result["source_sha256"] = source_sha
    if read_json(path.absolute())[1] != source_sha:
        result["busy"] = True
        result["blockers"].append(dict(occupies=True, reason="registration_changed_during_projection"))
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
