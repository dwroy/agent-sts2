"""Supervisor-void receipts for held ordinary learners; never publish or reclaim."""
from contextlib import contextmanager, ExitStack
import copy
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import sqlite3
import subprocess
import time
from types import SimpleNamespace

import own_learning_slot as slot
from issue_session_support import safe_path, stamp, require_host_process_view
from learner_tui import persist, REGISTRATION_FIELDS
from learner_tabs import BATCH, IDENTITY, LearnerTabs, batch_label, native_evidence, shell_empty
import publication_gate

SCHEMA = "learner-supervisor-void-v1"
VERDICT = re.compile(r"https://github\.com/dwroy/agent-sts2/issues/77#issuecomment-([0-9]+)")


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()


def original(row):
    return {k: v for k, v in row.items() if k != "supervisor_close"}


def verdict(url, batch, fetch=None):
    match = VERDICT.fullmatch(url or "")
    if not match:
        raise ValueError("verdict must be a #77 comment URL")
    if fetch is None:
        def fetch(comment):
            return json.loads(subprocess.check_output(
                ["gh", "api", "repos/dwroy/agent-sts2/issues/comments/" + comment], timeout=30))
    value = fetch(match[1])
    body = value.get("body", "")
    if (value.get("user", {}).get("login") != "dwroy" or value.get("id") != int(match[1])
            or value.get("issue_url") != "https://api.github.com/repos/dwroy/agent-sts2/issues/77"
            or value.get("html_url") != url or not isinstance(body, str)
            or not body.startswith("[Claude]") or not any(
                batch in re.findall(BATCH.pattern, line) and "作废收尾" in line
                and not re.search(r"不要|不得|禁止|不能|不予|不可|未裁决", line)
                for line in body.splitlines())):
        raise ValueError("verdict must be a dwroy [Claude] #77 void decision naming this batch")
    # Reactions and avatar changes cannot invalidate an unchanged authored verdict.
    comment = {k: value.get(k) for k in ("id", "issue_url", "html_url", "body", "created_at", "updated_at")}
    comment["user"] = dict(login="dwroy")
    return dict(url=url, comment=comment, sha256=digest(comment), body_sha256=hashlib.sha256(body.encode()).hexdigest())


def terminal(receipt, raw, now):
    """Bind identity and the latest turn, without accepting a report or prompt as knowledge."""
    if receipt.get("submitted") is not True or not raw.endswith(b"\n") or len(raw) > 64 * 1024 * 1024:
        raise ValueError("native snapshot incomplete")
    rows = [json.loads(line) for line in raw.splitlines()]
    meta = [r["payload"] for r in rows if r.get("type") == "session_meta"]
    if len(meta) != 1 or meta[0].get("id") != receipt.get("session") or meta[0].get("cwd") != receipt.get("cwd"):
        raise ValueError("native session/cwd identity differs")
    turn, ended, ended_at = None, False, None
    for row in rows:
        if row.get("type") != "event_msg":
            continue
        event = row.get("payload", {})
        kind = event.get("type")
        if kind == "task_started":
            turn, ended, ended_at = event.get("turn_id"), False, None
            if not isinstance(turn, str) or not turn:
                raise ValueError("native turn identity missing")
        elif kind in ("task_complete", "turn_aborted"):
            if turn is None or event.get("turn_id") != turn:
                raise ValueError("native terminal turn differs")
            ended = True
            ended_at = dt.datetime.fromisoformat(row["timestamp"].replace("Z", "+00:00"))
            if ended_at.tzinfo is None:
                raise ValueError("native terminal timestamp is not absolute")
        elif kind == "user_message":
            # Queued input after completion is not an idle native session.
            ended = False
    if not ended or ended_at is None:
        raise ValueError("native latest turn is active or has pending input")
    idle = now - ended_at.timestamp()
    if idle <= 1800:
        raise ValueError("native latest turn has not been idle for over 30 minutes")
    return dict(session=receipt["session"], turn=turn, ended_at=ended_at.isoformat(), idle_seconds=idle,
                prompt_verified=False, report_accepted=False)


@contextmanager
def no_writers(root, directory):
    """Hold existing nonblocking writer barriers through identity checks, TERM and receipt."""
    from learning_runtime import capture
    chosen = capture(root, directory)
    directories = set(chosen.get("read_directories", []))
    if chosen.get("directory"):
        directories.add(chosen["directory"])
    with ExitStack() as stack:
        stack.enter_context(publication_gate.locks([
            directory / "game-admission.lock", root / "ops/knowledge-refresh.lock",
            root / "ops/live-merge.lock", directory / "ordinary-close.lock"]))
        marker = publication_gate.read(root, directory)
        if marker and marker.get("phase") != "waiting":
            raise ValueError("publication write transaction is active or unknown")
        for name in sorted(directories):
            data = safe_path(root, name)
            if data == root / "data" or not data.is_relative_to(root / "data"):
                raise ValueError("D1 directory is outside original data scope")
            stack.enter_context(publication_gate.locks([data / "data-publication.lock"]))
            for path in data.glob("refresh-journal-*.json"):
                row, _ = slot.read_json(path)
                if row.get("schema") != "fixed-data-journal-v1" or row.get("status") not in ("committed", "restored"):
                    raise ValueError("D1 attempt/release is active or unknown")
            database = safe_path(root, data / "learning.sqlite")
            if not database.is_file():
                raise ValueError("original D1 database unavailable")
            db = sqlite3.connect(database.as_uri() + "?mode=ro", uri=True, timeout=0)
            try:
                for payload, in db.execute("SELECT payload FROM data_attempts"):
                    if json.loads(payload).get("status") not in ("published", "unchanged"):
                        raise ValueError("D1 attempt status is unknown")
            finally:
                db.close()
        # Operational completions also use the short source barriers above.
        yield


class Host:
    """Strict numeric process identities; TERM only, with no helper name exemptions."""
    def processes(self):
        found = {}
        for path in Path("/proc").glob("[0-9]*/stat"):
            try:
                fields = path.read_text().rsplit(")", 1)[1].split()
                if fields[0] not in ("Z", "X"):
                    found[int(path.parent.name)] = dict(birth=fields[19], ppid=int(fields[1]),
                        pgid=int(fields[2]), sid=int(fields[3]), uid=path.stat().st_uid)
            except FileNotFoundError:
                continue
        return found

    def group(self, receipt):
        processes = self.processes()
        pid = receipt["pid"]
        if pid not in processes:
            return {}
        owner = processes[pid]
        if owner["birth"] != receipt["birth"] or owner["pgid"] != pid:
            raise ValueError("native PID reused or process group changed")
        members = {pid}
        while True:
            grown = members | {p for p, row in processes.items() if row["ppid"] in members}
            if grown == members:
                break
            members = grown
        groups = {processes[p]["pgid"] for p in members}
        if (os.getpgrp() in groups or any(p not in members and row["pgid"] in groups for p, row in processes.items())
                or any(processes[p]["uid"] != os.getuid() or processes[p]["sid"] != owner["sid"] for p in members)):
            raise ValueError("native descendant group contains unrelated processes")
        return {str(p): processes[p] for p in sorted(members)}

    def stop(self, members):
        if not members:
            return
        groups = {row["pgid"] for row in members.values()}
        # Descendant groups precede the original leader group. Do not kill a shell.
        roots = [int(p) for p, row in members.items() if str(row["ppid"]) not in members]
        if len(roots) != 1 or members[str(roots[0])]["pgid"] != roots[0]:
            raise ValueError("original native group leader is ambiguous")
        native = roots[0]
        for group in sorted(groups - {native}) + [native]:
            current = self.processes()
            for pid, row in current.items():
                if str(pid) in members and any(row[k] != members[str(pid)][k] for k in ("birth", "pgid", "sid", "uid")):
                    raise ValueError("native descendant identity changed before TERM")
                if row["pgid"] in groups and (str(pid) not in members or any(
                        row[k] != members[str(pid)][k] for k in ("birth", "pgid", "sid", "uid"))):
                    raise ValueError("native process group changed before TERM")
            if any(row["pgid"] == group for row in current.values()):
                os.killpg(group, signal.SIGTERM)
        deadline = time.monotonic() + 10
        while True:
            current = self.processes()
            if any(row["pgid"] in groups and (str(p) not in members or row["birth"] != members[str(p)]["birth"])
                   for p, row in current.items()):
                raise ValueError("native process group changed after TERM")
            if not any(str(p) in members and row["birth"] == members[str(p)]["birth"] for p, row in current.items()):
                return
            if time.monotonic() >= deadline:
                raise ValueError("TERM did not stop every native descendant; no KILL")
            time.sleep(0.1)


def pane_identity(root, directory, batch, row, receipt, members):
    """Absent is an explicit exception. Existing panes still require exact identity/empty input."""
    import issue_session
    from issue_session_support import load
    tabs = LearnerTabs(root, directory, dry=True)
    tree = safe_path(root, receipt["cwd"])
    if tree != root and (tree.parent != root / ".worktrees" or tree.name == "live"):
        raise ValueError("original learner workspace is not dedicated")

    def workspace(allowed):
        # The postmortem producer shares ROOT. Its write scope is guarded by
        # learn/K/live/D1 barriers; other project roles cannot be attributed to it.
        if tree != root:
            context = SimpleNamespace(root=root, board=tabs.board)
            probe = lambda proc: issue_session.Sessions.process_cwd(context, proc)
            if issue_session.processes(tree, allowed, probe):
                raise ValueError("learner workspace has unrelated command/test/write work")
    expected = receipt.get("identity", {})
    if any(not isinstance(expected.get(k), str) or not expected[k] for k in IDENTITY) or expected["pane_id"] != row["pane"]:
        raise ValueError("original pane identity missing")
    if any(other != batch and value.get("pane") == row["pane"] for other, value in load(tabs.state)["batches"].items()):
        raise ValueError("ambiguous pane owner")
    workspaces = tabs.herdr("workspace", "list")["workspaces"]
    panes = tabs.herdr("pane", "list", "--workspace", expected["workspace_id"])["panes"] if any(
        w.get("workspace_id") == expected["workspace_id"] for w in workspaces) else []
    matches = [p for p in panes if any(p.get(k) == expected[k] for k in ("pane_id", "tab_id", "terminal_id"))]
    if not matches:
        workspace({int(p) for p in members})
        return {k: expected[k] for k in IDENTITY} | dict(exception="pane_absent")
    if len(matches) != 1 or any(matches[0].get(k) != expected[k] for k in IDENTITY):
        raise ValueError("pane identity was replaced")
    pane = tabs.pane(row, load(tabs.host), receipt["label"])
    info = tabs.herdr("pane", "process-info", "--pane", row["pane"])["process_info"]
    shell = info["shell_pid"]
    shell_birth = slot.process_birth(shell)
    if shell_birth is None:
        raise ValueError("pane shell identity missing")
    group = receipt["pid"] if members else shell
    if info["foreground_process_group_id"] != group:
        raise ValueError("pane foreground process group changed")
    allowed = {shell, *(int(p) for p in members)}
    if any(p["pid"] not in allowed for p in info["foreground_processes"]) or any(
            int(p) not in allowed for p in issue_session.process_children(Path(f"/proc/{shell}"))):
        raise ValueError("pane has unrelated foreground/background work")
    if members and pane.get("agent"):
        agent = tabs.herdr("agent", "get", row["pane"])["agent"]
        if (agent.get("agent") != "codex" or agent.get("name") != receipt.get("agent_name")
                or agent.get("agent_status") not in ("idle", "done") or agent.get("foreground_cwd") != receipt["cwd"]):
            raise ValueError("pane native agent is active or replaced")
    screen = issue_session.run(["herdr", "pane", "read", row["pane"], "--source", "visible", "--format", "ansi", "--lines", "15"]).decode()
    if not (issue_session.composer_state(screen) == "empty" if members else shell_empty(screen)):
        raise ValueError("pane input is not verified empty")
    if type(pane.get("revision")) is not int:
        raise ValueError("pane activity revision unavailable")
    workspace(allowed)
    return {k: pane[k] for k in IDENTITY} | dict(shell_pid=shell, shell_birth=shell_birth, revision=pane["revision"])


def closed(batch, row, directory, birth=None):
    """Projection consumes only a durable, exact original-row closure; no business success."""
    pointer = row.get("supervisor_close")
    birth = birth or slot.process_birth
    if not isinstance(pointer, dict) or directory is None:
        return False
    path = Path(directory).absolute() / "learner" / (batch + ".supervisor-close.json")
    value, sha = slot.read_json(path)
    if (pointer != dict(path=str(path), sha256=sha) or value.get("schema") != SCHEMA
            or value.get("state") != "supervisor_voided" or value.get("batch") != batch
            or value.get("original_batch") != original(row) or value.get("original_sha256") != digest(original(row))
            or value.get("verdict", {}).get("sha256") != digest(value.get("verdict", {}).get("comment"))):
        raise ValueError("supervisor close receipt differs from original registration")
    verdict(value["verdict"]["url"], batch, lambda _: value["verdict"]["comment"])
    if any(birth(pid) is not None for pid in value["supervisor_pids"] + [value["native"]["pid"]]):
        raise ValueError("closed owner PID is active or reused")
    if any(birth(int(pid)) is not None for pid in value.get("processes", {})):
        raise ValueError("closed descendant PID is active or reused")
    return True


def close(root, directory, state, batch, url, save, *, fetch=None, host=None, pane=pane_identity, now=None):
    """Caller owns learn.lock. Journal first; save only a pointer after all owners exited."""
    root, directory = Path(root).resolve(), Path(directory).absolute()
    if not BATCH.fullmatch(batch or ""):
        raise ValueError("invalid batch")
    authority = verdict(url, batch, fetch)
    require_host_process_view()
    host = host or Host()
    row = state["batches"].get(batch)
    if not row or row.get("external_source"):
        raise ValueError("not an ordinary own-learning batch")
    # Keep the original review state, which also suppresses demand/run retries.
    # Running/launching registrations still belong to their original recovery.
    if row.get("state") != "awaiting_review":
        raise ValueError("supervisor void requires the original awaiting_review registration")
    path = safe_path(root, directory / "learner" / (batch + ".supervisor-close.json"))
    before = copy.deepcopy(original(row))
    previous = slot.read_json(path)[0] if path.exists() else None
    if previous and (previous.get("schema") != SCHEMA or previous.get("state") not in ("prepared", "attention", "supervisor_voided")
                     or previous.get("original_batch") != before
                     or previous.get("verdict", {}).get("sha256") != authority["sha256"]):
        raise ValueError("original registration or supervisor verdict changed")
    if previous and previous.get("state") == "supervisor_voided":
        with no_writers(root, directory):
            candidate = dict(row, supervisor_close=dict(path=str(path), sha256=slot.read_json(path)[1]))
            if not closed(batch, candidate, directory):
                raise ValueError("completed receipt is not verified")
            if row != candidate:
                row.update(candidate); save(state)
        return dict(batch=batch, state="supervisor_voided", already_closed=True, receipt=str(path))
    projection = slot.snapshot(state, lambda pid: slot.process_birth(pid) is not None if type(pid) is int and pid > 1 else False, directory)
    if batch not in {e.get("batch") for e in projection["blockers"] + projection["pending_review"]}:
        raise ValueError("batch is not in own-learning blockers/pending_review")
    with no_writers(root, directory):
        if original(row) != before:
            raise ValueError("batch registration changed")
        tui_path = safe_path(root, directory / "learner" / (batch_label(batch, row) + ".tui.json"))
        receipt, tui_sha = slot.read_json(tui_path)
        if (receipt.get("label") != batch_label(batch, row) or receipt.get("pane") != row.get("pane")
                or receipt.get("cwd") != (row.get("worktree") or str(root))
                or any(receipt.get(k) != receipt.get("result", {}).get(k) for k in ("session", "turn", "rollout"))
                or type(receipt.get("pid")) is not int or receipt["pid"] <= 1
                or not re.fullmatch(r"[0-9]+", str(receipt.get("birth", "")))):
            raise ValueError("original native registration differs")
        members = host.group(receipt)
        identity = pane(root, directory, batch, row, receipt, members)
        supervisor_pids = [row["pid"]]
        evidence = {str(tui_path): tui_sha}
        exceptions = [identity["exception"]] if "exception" in identity else []
        if row.get("verification_deferred"):
            deferred_path = safe_path(root, row["verification_deferred"])
            deferred, deferred_sha = slot.read_json(deferred_path)
            registration = deferred.get("registration", {})
            if (deferred.get("schema") != "learner-verification-deferred-v1" or deferred.get("batch") != batch
                    or any(registration.get(k) != row.get(k) for k in REGISTRATION_FIELDS if k != "pid")
                    or deferred.get("supervisor", {}).get("pid") != registration.get("pid")):
                raise ValueError("original deferral binding differs")
            if registration.get("pid") != row["pid"]:
                if "pane_absent" not in exceptions:
                    raise ValueError("deferral supervisor changed while pane is present")
                exceptions.append("pane_absent_recovery_supervisor")
                supervisor_pids.append(registration["pid"])
            evidence[str(deferred_path)] = deferred_sha
        if any(slot.process_birth(pid) is not None for pid in supervisor_pids):
            raise ValueError("batch/recovery supervisor is active or PID reused")
        native, raw = native_evidence(root, directory, receipt)
        proof = terminal(receipt, raw, time.time() if now is None else now)
        # Interrupted TERM must not strand a surviving, now orphaned descendant.
        if previous:
            for pid in previous.get("processes", {}):
                if str(pid) not in members and slot.process_birth(int(pid)) is not None:
                    raise ValueError("previous TERM descendant remains active or PID reused")
        journal = dict(schema=SCHEMA, batch=batch, state="prepared", at=stamp(), verdict=authority,
                       original_batch=before, original_sha256=digest(before), originals=evidence,
                       supervisor_pids=supervisor_pids, native={k: receipt[k] for k in ("pid", "birth", "session", "turn", "rollout")},
                       native_evidence=native, latest_turn=proof, pane=identity, exceptions=exceptions,
                       processes=members or (previous or {}).get("processes", {}),
                       attempt_history=(previous or {}).get("attempt_history", []) + ([{
                           k: previous.get(k) for k in ("at", "state", "reason", "processes", "native_evidence")
                       }] if previous else []),
                       retry_authorized=False, success=False, published=False, retirement_authorized=False)

        def unchanged():
            if original(row) != before or any(slot.read_json(Path(p))[1] != sha for p, sha in evidence.items()):
                raise ValueError("original registration/evidence changed")
            if native_evidence(root, directory, receipt)[0] != native:
                raise ValueError("native activity changed")
            if any(slot.process_birth(pid) is not None for pid in supervisor_pids):
                raise ValueError("supervisor restarted or PID reused")

        unchanged()
        if pane(root, directory, batch, row, receipt, members) != identity or host.group(receipt) != members:
            raise ValueError("pane/process identity changed before TERM")
        persist(path, journal)
        try:
            # Re-read after the durable write, immediately before any signal.
            unchanged()
            if pane(root, directory, batch, row, receipt, members) != identity or host.group(receipt) != members:
                raise ValueError("pane/process identity changed after prepare")
            host.stop(members)
            if host.group(receipt) or any(slot.process_birth(int(pid)) is not None for pid in journal["processes"]):
                raise ValueError("native or descendant still active after TERM")
            unchanged()
            journal.update(state="supervisor_voided", finished=stamp(), term_groups=sorted({r["pgid"] for r in members.values()}))
            persist(path, journal)
            row["supervisor_close"] = dict(path=str(path), sha256=slot.read_json(path)[1])
            save(state)
        except Exception as error:
            if journal["state"] != "supervisor_voided":
                journal.update(state="attention", reason=str(error)); persist(path, journal)
            raise
    return dict(batch=batch, state="supervisor_voided", already_closed=False, receipt=str(path), exceptions=exceptions)
