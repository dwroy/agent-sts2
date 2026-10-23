#!/usr/bin/env python3
"""STS2 learner tab reclamation. Never finish a batch or delete its checkout."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from issue_session_support import atomic, load, locks, safe_path, secret_name, stamp, Board
import issue_session

SCHEMA = "learner-tab-retirement-v1"
BATCH = re.compile(r"[0-9]{8}-[0-9]{6}(?:-(?:s2-)?[a-z-]+)?")
TERMINAL = {"done", "failed", "rejected", "cancelled"}
IDENTITY = ("pane_id", "tab_id", "workspace_id", "terminal_id")
BINDING = ("pid", "pane", "task", "learner_task", "character", "worktree", "state", "rc", "finished", "cancelled")


def sha(path):
    h = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(262144), b""):
            h.update(block)
        os.fsync(source.fileno())
    return h.hexdigest()


def birth(pid):
    if type(pid) is not int or pid <= 1:
        raise ValueError("invalid process identity")
    try:
        fields = Path(f"/proc/{pid}/stat").read_text().rpartition(")")[2].split()
        return None if fields[0] in ("Z", "X") else fields[19]
    except FileNotFoundError:
        return None


def binding(row):
    return {key: row.get(key) for key in BINDING}


def batch_label(batch, row):
    """Match the original writer: postmortem uses a timestamp key and a suffixed host label."""
    return "learner-" + batch + ("-postmortem" if row.get("task", "postmortem") == "postmortem" else "")


def shell_empty(screen):
    """Accept only a visible, empty standard bash prompt; unknown/custom prompts stay retained."""
    plain = re.sub(r"\x1b\[[0-?]*[ -/]*[@-~]", "", screen).replace("\r", "")
    lines = [line for line in plain.splitlines() if line.strip()]
    return bool(lines and re.fullmatch(r"(?:[\w.-]+@[\w.-]+:[^$#\n]*)?[$#] ?", lines[-1]))


def native_verifier(root):
    path = safe_path(root, root / "ops/learner_tui.py")
    spec = importlib.util.spec_from_file_location("learner_tab_native_verifier", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.verify_native


class LearnerTabs:
    def __init__(self, root, directory, *, dry=False, herdr=None):
        self.root, self.directory, self.dry = Path(root).resolve(), Path(directory), dry
        self.directory = safe_path(self.root, self.directory)
        self.herdr = herdr or issue_session.herdr
        self.board = Board(self.root)
        self.state = safe_path(self.root, self.directory / "learn.json")
        self.host = safe_path(self.root, self.directory / "herdr.json")
        self.path = safe_path(self.root, self.directory / "learner-tabs.json")
        self.inbox = safe_path(self.root, self.directory / "inbox-claude.md")
        self.data = load(self.path) if self.path.exists() else dict(schema=SCHEMA, root=str(self.root), events={}, notices={})
        if (not isinstance(self.data, dict) or self.data.get("schema") != SCHEMA or self.data.get("root") != str(self.root)
                or not isinstance(self.data.get("events"), dict) or not isinstance(self.data.get("notices"), dict)):
            raise ValueError("invalid learner tab journal")
        if (any(not isinstance(v, dict) or v.get("phase") not in ("pending", "sending", "done") for v in self.data["events"].values())
                or any(v not in ("sending", "done") for v in self.data["notices"].values())):
            raise ValueError("invalid learner tab action receipt")

    def save(self):
        if not self.dry:
            atomic(self.path, self.data)

    def warn(self, pane, reason):
        # Reasons are fixed program text; no terminal output, paths or exception details escape.
        key = hashlib.sha256((pane + ":" + reason).encode()).hexdigest()
        if key not in self.data["notices"] and not self.dry:
            self.data["notices"][key] = "sending"; self.save()
            with self.inbox.open("a") as handle:
                identity = pane if re.fullmatch(r"w[A-Za-z0-9]+:[pt][A-Za-z0-9]+", pane) else "未知身份"
                handle.write(f"{stamp()[11:16]} [board] #20 学习tab {identity} 回收保留：{reason}；请ops核原批次与learner-tabs.json。\n")
                handle.flush(); os.fsync(handle.fileno())
            self.data["notices"][key] = "done"; self.save()
        return dict(pane=pane, state="retained", reason=reason)

    def receipt_path(self, batch, suffix, row=None):
        row = load(self.state)["batches"][batch] if row is None else row
        return safe_path(self.root, self.directory / "learner" / (batch_label(batch, row) + suffix))

    def files(self, paths):
        result = {}
        for role, path in paths.items():
            path = safe_path(self.root, path)
            if secret_name(path) or not path.is_file():
                raise ValueError("batch artifacts missing or unsafe")
            result[role] = dict(path=str(path.relative_to(self.root)), sha256=sha(path))
        return result

    def current(self, batch):
        if not isinstance(batch, str) or not BATCH.fullmatch(batch):
            raise ValueError("invalid batch identity")
        batches = load(self.state)["batches"]
        row = batches[batch]
        if (row.get("state") not in TERMINAL or not row.get("finished")
                or type(row.get("rc")) is not int or row["rc"] in (75, 124)):
            raise ValueError("batch is not safely terminal")
        if any(key != batch and other.get("pane") == row.get("pane") for key, other in batches.items()):
            raise ValueError("batch pane ownership is ambiguous")
        host = load(self.host)
        label = batch_label(batch, row)
        if (host.get("workspace_label") != "sts2-run" or not row.get("pane")
                or host["panes"][label]["pane_id"] != row["pane"]):
            raise ValueError("batch or host binding changed")
        self.board.protect(dict(row, label=label, worktree=row.get("worktree") or str(self.root)))
        return row, host

    def pane(self, row, host, label):
        workspaces = self.herdr("workspace", "list")["workspaces"]
        ws = [w for w in workspaces if w.get("workspace_id") == host.get("workspace_id") and w.get("label") == "sts2-run"]
        if len(ws) != 1:
            raise ValueError("learner workspace identity changed")
        pane = self.herdr("pane", "get", row["pane"])["pane"]
        tabs = self.herdr("tab", "list", "--workspace", host["workspace_id"])["tabs"]
        tab = next((t for t in tabs if t.get("tab_id") == pane.get("tab_id")), None)
        panes = self.herdr("pane", "list", "--workspace", host["workspace_id"])["panes"]
        if (not tab or tab.get("pane_count") != 1 or pane.get("workspace_id") != host["workspace_id"]
                or [p.get("pane_id") for p in panes if p.get("tab_id") == pane.get("tab_id")] != [row["pane"]]
                or not all(isinstance(pane.get(k), str) and pane[k] for k in IDENTITY)):
            raise ValueError("learner tab identity changed or contains other panes")
        expected = host["panes"][label]
        if tab.get("label") not in (label, expected.get("title")):
            raise ValueError("learner tab title changed")
        return dict(pane, tab_label=tab["label"])

    def idle(self, pane, proof=None):
        info = self.herdr("pane", "process-info", "--pane", pane["pane_id"])["process_info"]
        shell = info["shell_pid"]
        if type(shell) is not int or shell <= 1:
            raise ValueError("shell identity unavailable")
        allowed = {shell}
        if pane.get("agent"):
            if not proof or not proof.get("agent_name"):
                raise ValueError("unowned agent in learner pane")
            agent = self.herdr("agent", "get", pane["pane_id"])["agent"]
            if (agent.get("agent") != "codex" or agent.get("name") != proof["agent_name"]
                    or agent.get("pane_id") != pane["pane_id"] or agent.get("agent_status") not in ("idle", "done")
                    or agent.get("foreground_cwd") != proof["cwd"]
                    or birth(proof["native_pid"]) != proof["native_birth"]):
                raise ValueError("learner agent is active or replaced")
            allowed.add(proof["native_pid"])
            allowed.update(issue_session.idle_codex_helpers(allowed))
            if info["foreground_process_group_id"] != proof["native_pid"]:
                raise ValueError("learner foreground identity changed")
        elif info["foreground_process_group_id"] != shell:
            raise ValueError("learner pane has active command")
        if any(p.get("pid") not in allowed for p in info["foreground_processes"]):
            raise ValueError("learner pane has extra foreground process")
        # A shell can own background jobs even when its foreground group is idle.
        for pid in allowed:
            if any(int(child) not in allowed for child in issue_session.process_children(Path(f"/proc/{pid}"))):
                raise ValueError("learner pane has background work")
        screen = issue_session.run(["herdr", "pane", "read", pane["pane_id"], "--source", "visible", "--format", "ansi", "--lines", "15"]).decode()
        if pane.get("agent"):
            if issue_session.composer_state(screen) != "empty":
                raise ValueError("learner composer is not empty")
        else:
            # Process-idle alone cannot prove an empty editable shell command.
            if not shell_empty(screen):
                raise ValueError("shell input readiness is unverified")
        if type(pane.get("revision")) is not int:
            raise ValueError("pane activity revision unavailable")
        shell_birth = birth(shell)
        if shell_birth is None:
            raise ValueError("original shell is no longer live")
        return {k: pane[k] for k in IDENTITY} | dict(shell_pid=shell, shell_birth=shell_birth, tab_label=pane["tab_label"], revision=pane["revision"])

    def seal(self, batch):
        row, host = self.current(batch)
        if row["pid"] != os.getppid() or birth(row["pid"]) is None:
            raise ValueError("only the registered supervisor may seal retirement")
        proof = self.seal_proof(batch, row, host, birth(row["pid"]))
        return self.store_seal(batch, row, proof)

    def recovery_owner(self, batch, row, receipt):
        """Require the original wrapper's persisted identity, never a replacement PID."""
        wrapper = receipt.get("wrapper") or {}
        supervisor = wrapper.get("supervisor") or {}
        owner_birth = supervisor.get("birth")
        expected = hashlib.sha256(json.dumps(row, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        if (type(wrapper.get("version")) is not int or wrapper["version"] != 1
                or wrapper.get("batch") != batch or wrapper.get("state") != row["state"]
                or wrapper.get("rc") != row["rc"] or wrapper.get("finished") != row["finished"]
                or wrapper.get("batch_sha256") != expected or supervisor.get("pid") != row["pid"]
                or not isinstance(owner_birth, str) or not re.fullmatch(r"[0-9]+", owner_birth)):
            raise ValueError("original wrapper supervisor proof missing or changed")
        if birth(row["pid"]) is not None:
            raise ValueError("recovery requires the original supervisor PID to be absent")
        if receipt.get("state") != "session-ended" or birth(receipt["pid"]) is not None:
            raise ValueError("recovery requires the original native PID to be absent")
        output = self.directory / "learner" / (batch + ".out")
        if receipt.get("output") != dict(path=str(output), sha256=sha(safe_path(self.root, output))):
            raise ValueError("original output proof missing or changed")
        event = self.data["events"].get(batch)
        if event and event.get("phase") != "pending":
            raise ValueError("tab close acknowledgement uncertain; reconcile explicitly")
        return owner_birth

    def recovery_proof(self, batch, evidence):
        row, host = self.current(batch)
        evidence_record = self.files({"evidence": evidence})["evidence"]
        receipt = load(self.receipt_path(batch, ".tui.json", row))
        owner_birth = self.recovery_owner(batch, row, receipt)
        proof = self.seal_proof(batch, row, host, owner_birth)
        proof.update(authority="ops-recovery", recovery=dict(version=1, evidence=evidence_record))
        # Native verification can take time: recheck the entire row, original files and
        # terminal immediately before allowing an explicit recovery seal to persist.
        row2, host2 = self.current(batch)
        if (row2 != row or host2 != host
                or self.idle(self.pane(row2, host2, proof["label"]), proof) != proof["identity"]
                or self.files({k: self.root / v["path"] for k, v in proof["files"].items()}) != proof["files"]
                or self.files({"evidence": evidence})["evidence"] != evidence_record):
            raise ValueError("batch or recovery evidence changed before seal")
        self.recovery_owner(batch, row2, load(self.receipt_path(batch, ".tui.json", row2)))
        return row, proof

    def recover_seal(self, batch, evidence):
        row, proof = self.recovery_proof(batch, evidence)
        destination = self.receipt_path(batch, ".tab-retirement.json", row)
        if destination.exists():
            old = load(destination)
            proof["sealed_at"] = old.get("sealed_at")
            if old.get("authority") == "ops-recovery":
                proof["recovery"].update({key: old["recovery"].get(key) for key in ("operator_pid", "operator_birth")})
                self.check_recovery_operator(proof["recovery"])
            if old != proof:
                raise ValueError("retirement seal changed; original retained")
        else:
            operator = os.getpid()
            operator_birth = birth(operator)
            if operator_birth is None:
                raise ValueError("recovery operator identity unavailable")
            proof["recovery"].update(operator_pid=operator, operator_birth=operator_birth)
            self.check_recovery_operator(proof["recovery"])
        if self.dry:
            return dict(batch=batch, state="eligible", authority="ops-recovery", action="seal only")
        return self.store_seal(batch, row, proof)

    def check_recovery_operator(self, recovery):
        if (type(recovery.get("operator_pid")) is not int or recovery["operator_pid"] <= 1
                or not isinstance(recovery.get("operator_birth"), str)
                or not re.fullmatch(r"[0-9]+", recovery["operator_birth"])):
            raise ValueError("ops recovery operator provenance missing")

    def seal_proof(self, batch, row, host, owner_birth):
        """Share all original native, artifact, authority and empty-input gates."""
        label = batch_label(batch, row)
        path = self.receipt_path(batch, ".tui.json", row)
        output = self.directory / "learner" / (batch + ".out")
        receipt = load(path)
        result = receipt["result"]
        if type(result.get("code")) is not int:
            raise ValueError("native result code missing")
        if result.get("code") != row["rc"] and not (result.get("code") == 3 and row["rc"] == 1 and receipt.get("state") == "not-started"):
            raise ValueError("batch finish and native result differ")
        paths = dict(tui=path, output=output, stderr=self.directory / "learner" / (batch + ".err"))
        initial_files = self.files(paths)
        unstarted = receipt.get("state") == "not-started" and type(receipt.get("models_started")) is int and receipt["models_started"] == 0
        proof = dict(schema=SCHEMA, root=str(self.root), state_file=str(self.state), batch=batch, binding=binding(row),
                     owner_pid=row["pid"], owner_birth=owner_birth, authority="batch", label=label,
                     cwd=(row.get("worktree") or str(self.root)), sealed_at=stamp())
        if (receipt.get("pane") != row["pane"] or receipt.get("label") != label or receipt.get("cwd") != proof["cwd"]):
            raise ValueError("original receipt is not bound to the registered batch")
        if unstarted:
            if result.get("code") != 3 or row["rc"] not in (1, 3) or receipt.get("submitted") is not False or receipt.get("bindings") != [] or receipt.get("submissions") != []:
                raise ValueError("unstarted batch has model activity")
        else:
            if (receipt.get("state") not in ("session-ended", "turn-ended") or receipt.get("retirement_authorized") is not True
                    or receipt.get("pane") != row["pane"] or receipt.get("label") != label
                    or receipt.get("cwd") != proof["cwd"]):
                raise ValueError("original batch disposal authority missing")
            if (receipt["state"] == "session-ended" and (result.get("stopped") is not True
                    or birth(receipt["pid"]) == receipt.get("birth"))):
                raise ValueError("native process is not verified stopped")
            paths.update(learner_log=Path(receipt["artifacts"]["log"]), rollout=Path(result["rollout"]))
            initial_files = self.files(paths)
            name_binding = json.dumps([label, row["pane"], proof["cwd"]], ensure_ascii=False, separators=(",", ":"))
            if (receipt.get("agent_name_version") != 1
                    or receipt.get("agent_name") != "learner-" + hashlib.sha256(name_binding.encode()).hexdigest()[:24]):
                raise ValueError("original native agent name differs")
            native_verifier(self.root)(receipt)
            if sha(safe_path(self.root, paths["learner_log"])) != receipt["artifacts"].get("sha256"):
                raise ValueError("learner artifacts changed")
            summary = None
            for line in paths["learner_log"].read_text().splitlines():
                record = json.loads(line)
                if record.get("type") == "learner_summary": summary = record
            if (not summary or summary.get("exit_code") != result["code"]
                    or summary.get("summary", {}).get("sessionId") != result.get("session")
                    or not output.is_file() or output.stat().st_size == 0):
                raise ValueError("original learner summary/output missing")
            # Failed/cancelled turns also need an actual terminal native event.
            ended = False
            for line in safe_path(self.root, paths["rollout"]).read_text().splitlines(keepends=True):
                if not line.endswith("\n"):
                    raise ValueError("native record has a partial final line")
                record = json.loads(line)
                payload = record.get("payload", {})
                if record.get("type") == "event_msg" and payload.get("turn_id") == result.get("turn"):
                    if payload.get("type") == "task_started": ended = False
                    if payload.get("type") in ("task_complete", "turn_aborted"): ended = True
            if not ended:
                raise ValueError("original native turn is still open")
            proof.update(agent_name=receipt["agent_name"], native_pid=receipt["pid"], native_birth=receipt["birth"])
        pane = self.pane(row, host, label)
        if any(pane[k] != receipt["identity"].get(k) for k in IDENTITY):
            raise ValueError("original pane identity differs")
        cwd = safe_path(self.root, proof["cwd"])
        if cwd == self.root / ".worktrees/live":
            raise ValueError("live learner cwd retained")
        proof["identity"] = self.idle(pane, proof)
        proof["files"] = self.files(paths)
        if proof["files"] != initial_files or load(path) != receipt:
            raise ValueError("original artifacts changed during seal verification")
        return proof

    def store_seal(self, batch, row, proof):
        destination = self.receipt_path(batch, ".tab-retirement.json", row)
        if destination.exists():
            old = load(destination)
            proof["sealed_at"] = old.get("sealed_at")
            if old != proof:
                raise ValueError("retirement seal changed; original retained")
        else:
            atomic(destination, proof)
        return dict(batch=batch, state="sealed")

    def reclaim(self, batch, pane_id):
        row, host = self.current(batch)
        label = batch_label(batch, row)
        proof = load(self.receipt_path(batch, ".tab-retirement.json", row))
        if (proof.get("schema") != SCHEMA or proof.get("root") != str(self.root)
                or proof.get("state_file") != str(self.state) or proof.get("batch") != batch
                or proof.get("binding") != binding(row) or proof.get("authority") not in ("batch", "ops-recovery") or proof.get("label") != label
                or proof.get("owner_pid") != row["pid"] or not proof.get("owner_birth") or row["pane"] != pane_id):
            raise ValueError("retirement receipt or ownership differs")
        if birth(proof["owner_pid"]) == proof["owner_birth"]:
            return dict(pane=pane_id, state="queued", reason="supervisor still retiring")
        receipt = load(self.receipt_path(batch, ".tui.json", row))
        if proof["authority"] == "ops-recovery":
            recovery = proof.get("recovery") or {}
            self.check_recovery_operator(recovery)
            if (type(recovery.get("version")) is not int or recovery["version"] != 1 or not proof.get("sealed_at")
                    or self.recovery_owner(batch, row, receipt) != proof["owner_birth"]):
                raise ValueError("ops recovery provenance missing or changed")
            recovery_evidence = recovery["evidence"]
            if self.files({"evidence": self.root / recovery_evidence["path"]})["evidence"] != recovery_evidence:
                raise ValueError("ops recovery evidence changed")
        if (receipt.get("pane") != row["pane"] or receipt.get("label") != label or receipt.get("cwd") != proof.get("cwd")
                or (receipt.get("state") != "not-started" and receipt.get("retirement_authorized") is not True)):
            raise ValueError("batch disposal authority missing")
        required = {"tui", "output", "stderr"} | ({"learner_log", "rollout"} if receipt.get("state") != "not-started" else set())
        if not required <= proof.get("files", {}).keys():
            raise ValueError("retirement artifact proof missing")
        for record in proof["files"].values():
            if self.files({"check": self.root / record["path"]})["check"] != record:
                raise ValueError("retirement artifacts changed")
        if proof["files"]["tui"]["path"] != str((self.directory / "learner" / (label + ".tui.json")).relative_to(self.root)):
            raise ValueError("original TUI receipt path changed")
        pane = self.pane(row, host, label)
        if self.idle(pane, proof) != proof["identity"]:
            raise ValueError("terminal identity or shell changed")
        event = self.data["events"].get(batch)
        if event and event.get("phase") != "pending":
            raise ValueError("tab close acknowledgement uncertain; reconcile explicitly")
        if self.dry:
            return dict(pane=pane_id, state="eligible")
        tail = issue_session.run(["herdr", "pane", "read", pane_id, "--source", "recent-unwrapped", "--lines", "80"])
        tail_path = safe_path(self.root, self.directory / "learner-tab-tails" / (batch + "-" + hashlib.sha256(tail).hexdigest() + ".log"))
        tail_path.parent.mkdir(parents=True, exist_ok=True)
        with tail_path.open("wb") as handle:
            handle.write(tail); handle.flush(); os.fsync(handle.fileno())
        if tail_path.read_bytes() != tail:
            raise ValueError("tail persistence failed")
        # Repeat all evidence, batch, binding and input checks immediately before the destructive call.
        row2, host2 = self.current(batch)
        if binding(row2) != proof["binding"] or host2 != host or self.files({k: self.root / v["path"] for k, v in proof["files"].items()}) != proof["files"]:
            raise ValueError("batch or artifacts changed before close")
        if self.idle(self.pane(row2, host2, label), proof) != proof["identity"]:
            raise ValueError("pane changed before close")
        if proof["authority"] == "ops-recovery":
            if (row2 != row or self.recovery_owner(batch, row2, load(self.receipt_path(batch, ".tui.json", row2))) != proof["owner_birth"]
                    or self.files({"evidence": self.root / recovery_evidence["path"]})["evidence"] != recovery_evidence):
                raise ValueError("ops recovery authority changed before close")
        self.data["events"][batch] = dict(phase="sending", pane=pane_id, tab=pane["tab_id"], tail=str(tail_path.relative_to(self.root)))
        self.save()
        self.herdr("tab", "close", pane["tab_id"])
        remaining = self.herdr("tab", "list", "--workspace", host["workspace_id"])["tabs"]
        if any(t.get("tab_id") == pane["tab_id"] for t in remaining):
            raise ValueError("closed tab is still present")
        del host["panes"][label]
        atomic(self.host, host)
        self.data["events"][batch].update(phase="done", state="reclaimed", closed_at=stamp())
        self.save()
        return dict(pane=pane_id, state="reclaimed", worktree="original retention worker")

    def tick(self):
        # Discovery is limited to the project learner workspace and learner tab titles/labels.
        workspaces = [w for w in self.herdr("workspace", "list")["workspaces"] if w.get("label") == "sts2-run"]
        results = []
        batches = load(self.state)["batches"] if self.state.exists() else {}
        for ws in workspaces:
            tabs = self.herdr("tab", "list", "--workspace", ws["workspace_id"])["tabs"]
            panes = self.herdr("pane", "list", "--workspace", ws["workspace_id"])["panes"]
            for event in list(self.data["events"].values()):
                if event["phase"] == "sending" and not any(t.get("tab_id") == event.get("tab") for t in tabs):
                    results.append(self.warn(event.get("pane", ""), "关tab回执不确定，禁止自动重关"))
            for tab in tabs:
                owned = [p for p in panes if p.get("tab_id") == tab.get("tab_id")]
                titles = [str(tab.get("label", "")), str(tab.get("title", ""))] + [str(p.get("label", "")) for p in owned]
                if not any(t.startswith(("学习大脑 ·", "learner-")) for t in titles):
                    continue
                pane_id = owned[0].get("pane_id", "") if len(owned) == 1 else tab.get("tab_id", "")
                owners = [(b, r) for b, r in batches.items() if r.get("pane") == pane_id]
                if len(owners) == 1 and owners[0][1].get("state") == "running":
                    results.append(dict(pane=pane_id, state="running")); continue
                try:
                    if len(owned) != 1 or len(owners) != 1:
                        raise ValueError("learner identity or registration missing")
                    results.append(self.reclaim(owners[0][0], pane_id))
                except (OSError, ValueError, KeyError, TypeError, IndexError, AttributeError, subprocess.SubprocessError) as error:
                    reason = "回执/身份/产物/处置权核验未通过"
                    if isinstance(error, FileNotFoundError): reason = "回执或产物缺失"
                    elif isinstance(error, ValueError) and str(error) in ("learner composer is not empty", "shell input readiness is unverified"):
                        reason = "发现人工输入或输入状态不明"
                    elif isinstance(error, ValueError) and str(error) == "tab close acknowledgement uncertain; reconcile explicitly":
                        reason = "关tab回执不确定，禁止自动重关"
                    results.append(self.warn(pane_id, reason))
        return dict(state="ok", results=results)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("tick", "seal", "recover-seal"))
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--state-dir", type=Path)
    parser.add_argument("--batch")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--evidence", type=Path, help="existing local review file inside this repository (recover-seal only)")
    parser.add_argument("--apply", action="store_true", help="persist an ops recovery seal; never close a tab")
    args = parser.parse_args(argv)
    if args.apply and (args.command != "recover-seal" or args.dry_run):
        parser.error("--apply is exclusive to recover-seal and cannot be combined with --dry-run")
    if args.command == "recover-seal" and (not args.batch or not args.evidence):
        parser.error("recover-seal requires --batch and --evidence")
    if args.evidence and args.command != "recover-seal":
        parser.error("--evidence is exclusive to recover-seal")
    args.dry_run = args.dry_run or (args.command == "recover-seal" and not args.apply)
    root = args.root.resolve()
    directory = safe_path(root, args.state_dir or root / "ops/codex-ops")
    stage = "configuration"
    try:
        tab = LearnerTabs(root, directory, dry=args.dry_run)
        if args.dry_run and args.command == "seal":
            raise ValueError("seal cannot run in dry mode")
        stage = "lock"
        with locks([] if args.dry_run else [directory / "learn.lock", directory / "herdr.json.lock", directory / "learner-tabs.lock"]):
            stage = "worker"
            tab = LearnerTabs(root, directory, dry=args.dry_run)
            if args.command == "recover-seal":
                evidence = args.evidence if args.evidence.is_absolute() else root / args.evidence
                result = tab.recover_seal(args.batch, evidence)
            else:
                result = tab.seal(args.batch) if args.command == "seal" else tab.tick()
        print(json.dumps(result, ensure_ascii=False)); return 0
    except (OSError, ValueError, KeyError, TypeError, IndexError, AttributeError, subprocess.SubprocessError) as error:
        if isinstance(error, BlockingIOError) and stage == "lock":
            print('{"state":"queued","reason":"learner retirement lock busy"}'); return 0
        if args.command == "recover-seal" and isinstance(error, (ValueError, FileNotFoundError)) and not isinstance(error, json.JSONDecodeError):
            print('{"state":"retained","reason":"ops recovery evidence or current safety gates unverified"}'); return 0
        if not args.dry_run:
            # Do not touch a damaged journal to report its failure.
            marker = safe_path(root, directory / "learner-tabs-failure-notice.json")
            with locks([safe_path(root, directory / "learner-tabs-failure-notice.lock")]):
                notice = load(marker) if marker.exists() else None
                if notice is None:
                    atomic(marker, dict(root=str(root), state="sending"))
                    with safe_path(root, directory / "inbox-claude.md").open("a") as handle:
                        handle.write(f"{stamp()[11:16]} [board] #20 学习tab回收异常；保留现场，请ops核原批次及回执。\n")
                        handle.flush(); os.fsync(handle.fileno())
                    atomic(marker, dict(root=str(root), state="done"))
        print('{"state":"failed","reason":"learner retirement inspection failed"}'); return 1


if __name__ == "__main__":
    raise SystemExit(main())
