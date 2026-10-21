#!/usr/bin/env python3
"""Journal issue-scoped Herdr sessions; delegate checkout deletion to the existing retention worker."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
import issue_session_support as retention

SCHEMA = "issue-sessions-v2"
SLUG = re.compile(r"[a-z][a-z0-9-]{0,60}")
STATES = {"allocating", "allocated", "creating-tab", "tab-created", "starting", "active", "tab-closing",
          "waiting-worktree", "reclaimed"}


def run(args, **kwargs):
    # Never echo CLI output on failure: tails and API errors may contain private data.
    result = subprocess.run(list(map(str, args)), capture_output=True, timeout=90, **kwargs)
    if result.returncode:
        raise ValueError(Path(str(args[0])).name + " command failed (exit " + str(result.returncode) + "); original state retained")
    return result.stdout


def failure_reason(error):
    # Do not disclose subprocess output, argv, credential paths or OS filenames.
    if isinstance(error, subprocess.TimeoutExpired):
        return "external command timed out; query actual state before retry"
    if isinstance(error, KeyError):
        key = str(error.args[0])
        return "missing response/configuration field: " + (key if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key) else "unknown")
    if isinstance(error, OSError):
        return "system operation failed: " + (error.strerror or type(error).__name__)
    if isinstance(error, ValueError):
        return str(error)
    return type(error).__name__ + ": invalid response/configuration shape"


def herdr(*args):
    result = json.loads(run(["herdr", *args]))
    if result.get("error") or not isinstance(result.get("result"), dict):
        raise ValueError("invalid Herdr reply; original state retained")
    return result["result"]


class Sessions:
    def __init__(self, root, directory=None, config=None):
        self.root = Path(root).resolve()
        self.board = retention.Board(self.root, config)
        self.directory = retention.safe_path(self.root, directory or self.board.session["state_dir"])
        self.project = self.board.project(self.directory)
        self.path = retention.safe_path(self.root, self.directory / "issue-sessions.json")
        self.data = {"schema": SCHEMA, "root": str(self.root), "repo": self.board.repo, "sessions": {}}
        if self.path.exists():
            self.data = retention.load(self.path)
        self.validate()

    def validate(self):
        if (not isinstance(self.data, dict) or self.data.get("schema") != SCHEMA
                or self.data.get("root") != str(self.root) or self.data.get("repo") != self.board.repo
                or not isinstance(self.data.get("sessions"), dict)):
            raise ValueError("invalid issue session registry; no actions taken")
        panes, tabs = set(), set()
        for key, row in self.data["sessions"].items():
            if not isinstance(row, dict) or not re.fullmatch(r"[1-9][0-9]{0,8}", key):
                raise ValueError("invalid issue session entry")
            number = int(key)
            if (row.get("issue") != number or not isinstance(row.get("slug"), str)
                    or not SLUG.fullmatch(row["slug"]) or row.get("state") not in STATES):
                raise ValueError("invalid issue session identity or state")
            expected = f"issue-{number}-{row['slug']}"
            if (row.get("branch") != expected or row.get("worktree") != str(self.board.trees / expected)
                    or row.get("label") != f"issue-{number}" or not retention.SHA.fullmatch(row.get("base", ""))
                    or not isinstance(row.get("started_at"), str)):
                raise ValueError("unsafe issue session binding")
            self.board.protect(row)
            if self.project.checked_tree(expected) != Path(row["worktree"]):
                raise ValueError("configured worktree adapter binding mismatch")
            if row.get("pane") or row.get("tab"):
                ws = row.get("workspace", "")
                if (not re.fullmatch(r"w[A-Za-z0-9]+", ws)
                        or not re.fullmatch(re.escape(ws) + r":p[A-Za-z0-9]+", row.get("pane", ""))
                        or not re.fullmatch(re.escape(ws) + r":t[A-Za-z0-9]+", row.get("tab", ""))
                        or row["pane"] in panes or row["tab"] in tabs
                        or not isinstance(row.get("terminal"), str) or not row["terminal"]):
                    raise ValueError("invalid or duplicate terminal identity")
                panes.add(row["pane"]); tabs.add(row["tab"])

    def save(self):
        self.validate()
        retention.atomic(self.path, self.data)

    def issue(self, number):
        return json.loads(run(["gh", "issue", "view", number, "-R", self.board.repo, "--json", "state,author,comments"]))

    def notice(self, number, event, text):
        # Reconcile an uncertain POST by its stable marker before attempting another POST.
        digest = hashlib.sha256((event + text).encode()).hexdigest()[:20]
        marker = f"<!-- issue-session:{number}:{digest} -->"
        comments = self.issue(number)["comments"]
        if any(c.get("author", {}).get("login") == self.board.owner and marker in c.get("body", "") for c in comments):
            return
        path = retention.safe_path(self.root, self.directory / "issue-session-comments" / f"{number}-{digest}.md")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f"{self.board.session['comment_prefix']} {text}\n\n{marker}\n")
        run(["gitleaks", "detect", "--no-git", "--source", path, "--redact"])
        run(["gh", "issue", "comment", number, "-R", self.board.repo, "--body-file", path])

    def inbox(self, message):
        path = retention.safe_path(self.root, self.board.inbox)
        with path.open("a") as handle:
            handle.write(f"- {retention.stamp()} [issue-session] {message}\n")

    def spawn(self, number, slug):
        key = str(number)
        if key in self.data["sessions"]:
            row = self.data["sessions"][key]
            if slug != row["slug"]:
                raise ValueError("issue already bound to another workspace")
            if row["state"] == "active":
                self.dispatched(row)
            # Never replay an uncertain tab creation, startup or prompt automatically.
            return {"issue": number, "state": row["state"], "existing": True}
        if not SLUG.fullmatch(slug):
            raise ValueError("invalid workspace slug")
        issue = self.issue(number)
        if issue["state"] != "OPEN" or issue["author"]["login"] != self.board.owner:
            raise ValueError("only open owner-authored issues can spawn sessions")
        dev = self.board.dev
        home = dev.get("codex_home")
        if not home:
            selector = retention.safe_path(self.root, dev["codex_home_file"]) if dev.get("codex_home_file") else None
            home = selector.read_text().strip() if selector and selector.is_file() else os.environ.get(dev.get("codex_home_env", ""))
        home = str(Path(home).expanduser()) if home else None
        if not home or not Path(home).is_absolute() or not (Path(home) / "auth.json").is_file():
            raise ValueError("existing project Codex home selector required; credentials not read")
        found = [w for w in herdr("workspace", "list")["workspaces"] if w.get("label") == self.board.workspace]
        if len(found) > 1:
            raise ValueError("ambiguous configured Herdr workspace")
        agents = herdr("agent", "list")["agents"]
        if any(a.get("name") == f"issue-{number}" for a in agents):
            raise ValueError("unregistered existing issue agent; register it explicitly")
        if sum(a.get("agent") == "codex" and bool(re.fullmatch(r"issue-[1-9][0-9]*", a.get("name", "")))
               for a in agents) >= dev["max_parallel"]:
            raise ValueError("configured developer concurrency limit reached")
        branch = f"issue-{number}-{slug}"
        base = retention.git(self.root, "rev-parse", self.board.worktree["base_ref"]).decode().strip()
        row = {"issue": number, "slug": slug, "branch": branch, "label": f"issue-{number}",
               "worktree": str(self.board.trees / branch), "base": base,
               "started_at": retention.stamp(), "state": "allocating"}
        self.data["sessions"][key] = row; self.save()
        self.command(self.board.worktree["allocate"], row)
        for command in self.board.worktree["prepare"]:
            self.command(command, row)
        row["state"] = "allocated"; self.save()
        row["state"] = "creating-tab"; self.save()
        if found:
            ws = found[0]["workspace_id"]
            created = herdr("tab", "create", "--workspace", ws, "--cwd", row["worktree"], "--label", row["label"],
                            "--env", f"CODEX_HOME={home}", "--no-focus")
        else:
            created = herdr("workspace", "create", "--cwd", row["worktree"], "--label", self.board.workspace,
                            "--env", f"CODEX_HOME={home}", "--no-focus")
            ws = created["workspace"]["workspace_id"]
        pane = created["root_pane"]
        row.update(workspace=ws, tab=created["tab"]["tab_id"], pane=pane["pane_id"],
                   terminal=pane["terminal_id"], state="tab-created")
        self.save()
        if not found:
            herdr("tab", "rename", row["tab"], row["label"])
        # New shells inherit the server's priority; lower only this newly created shell before starting Codex.
        info = herdr("pane", "process-info", "--pane", row["pane"])["process_info"]
        if (not isinstance(info["shell_pid"], int) or info["shell_pid"] <= 1
                or info["foreground_process_group_id"] != info["shell_pid"]):
            raise ValueError("new pane shell is not idle")
        os.setpriority(os.PRIO_PROCESS, info["shell_pid"], self.board.nice)
        row["state"] = "starting"; self.save()
        prompt = self.board.session["prompt"].format_map(self.values(row))
        herdr("agent", "start", row["label"], "--kind", "codex", "--pane", row["pane"], "--timeout", "60000",
              "--", "-m", dev["model"], "-c", "model_reasoning_effort=" + dev["effort"], "-s", "danger-full-access",
              "-a", "never", prompt)
        row["state"] = "active"; self.save()
        self.dispatched(row)
        return {"issue": number, "state": "active", "pane": row["pane"]}

    def dispatched(self, row):
        self.notice(row["issue"], "spawn", f"已派 issue-{row['issue']}：工作树 `{Path(row['worktree']).relative_to(self.root)}`，"
                    f"pane `{row['pane']}`、tab `{row['tab']}`，基线 `{row['base']}`；独立 Codex 会话，启动参数 {self.board.dev['model']}/{self.board.dev['effort']}（实际档位由原生回执验收）。")

    def register(self, number, slug, pane_id, base, started_at):
        if not SLUG.fullmatch(slug):
            raise ValueError("invalid workspace slug")
        previous = self.data["sessions"].get(str(number))
        if previous and (previous["state"] not in ("allocating", "allocated", "creating-tab", "tab-created", "starting")
                         or previous["slug"] != slug or previous["base"] != base
                         or previous["started_at"] != started_at
                         or (previous.get("pane") and previous["pane"] != pane_id)):
            raise ValueError("existing registration retained")
        pane = herdr("pane", "get", pane_id)["pane"]
        agent = herdr("agent", "get", pane_id)["agent"]
        branch = f"issue-{number}-{slug}"
        tree = self.board.trees / branch
        if agent.get("name") != f"issue-{number}" or agent.get("agent") != "codex":
            raise ValueError("only named issue Codex agents may be registered")
        if pane.get("cwd") != str(tree):
            raise ValueError("register: pane cwd mismatch for " + branch)
        if agent.get("foreground_cwd") != str(tree):
            raise ValueError("register: agent foreground_cwd mismatch for " + branch)
        if retention.git(tree, "branch", "--show-current").decode().strip() != branch:
            raise ValueError("register: worktree branch mismatch for " + branch)
        if not retention.ancestor(tree, base):
            raise ValueError("register: allocation base ancestor mismatch for " + branch)
        found = herdr("tab", "get", pane["tab_id"])["tab"]
        ws = herdr("workspace", "list")["workspaces"]
        if found.get("label") != f"issue-{number}":
            raise ValueError("register: tab label mismatch for issue-" + str(number))
        if not any(w.get("workspace_id") == pane["workspace_id"] and w.get("label") == self.board.workspace for w in ws):
            raise ValueError("register: workspace identity/label mismatch")
        row = {"issue": number, "slug": slug, "label": f"issue-{number}", "branch": branch,
               "worktree": str(tree), "base": base, "started_at": started_at, "state": "active",
               "workspace": pane["workspace_id"], "tab": pane["tab_id"], "pane": pane_id,
               "terminal": pane["terminal_id"], "adopted": True}
        self.data["sessions"][str(number)] = row
        try:
            self.save()
        except (ValueError, TypeError):
            if previous is None:
                del self.data["sessions"][str(number)]
            else:
                self.data["sessions"][str(number)] = previous
            raise
        return {"issue": number, "state": "registered"}

    def terminal(self, row):
        # A missing ID is proven by a successful list, never by a failed get/transport request.
        tabs = herdr("tab", "list", "--workspace", row["workspace"])["tabs"]
        tab = next((t for t in tabs if t["tab_id"] == row["tab"]), None)
        if not tab:
            return None, set()
        if tab.get("label") != row["label"] or tab.get("pane_count") != 1:
            raise ValueError("tab changed or has other panes")
        panes = herdr("pane", "list", "--workspace", row["workspace"])["panes"]
        owned = [p for p in panes if p.get("tab_id") == row["tab"]]
        if (len(owned) != 1 or owned[0].get("pane_id") != row["pane"]
                or owned[0].get("terminal_id") != row["terminal"] or owned[0].get("cwd") != row["worktree"]
                or owned[0].get("foreground_cwd") != row["worktree"]):
            raise ValueError("pane identity or cwd changed")
        pane = owned[0]
        info = herdr("pane", "process-info", "--pane", row["pane"])["process_info"]
        allowed = {info["shell_pid"]}
        if pane.get("agent"):
            agent = herdr("agent", "get", row["pane"])["agent"]
            if (agent.get("name") != row["label"] or agent.get("agent") != "codex"
                    or agent.get("pane_id") != row["pane"] or agent.get("foreground_cwd") != row["worktree"]
                    or agent.get("agent_status") not in ("idle", "done")):
                raise ValueError("issue agent is working, blocked, unknown or replaced")
            for proc in info["foreground_processes"]:
                if proc.get("name") == "codex" or (proc.get("name") == "node" and any(
                        Path(arg).name == "codex" for arg in proc.get("argv", []))):
                    allowed.add(proc["pid"])
                elif proc["pid"] != info["shell_pid"]:
                    raise ValueError("unexpected foreground process")
            screen = run(["herdr", "pane", "read", row["pane"], "--source", "visible", "--format", "ansi", "--lines", "15"])
            if composer_state(screen.decode()) != "empty":
                raise ValueError("composer has unsent text or is not visibly ready")
            allowed.update(idle_codex_helpers(allowed))
        elif info["foreground_process_group_id"] != info["shell_pid"]:
            raise ValueError("pane has an unrecognized running command")
        return pane, allowed

    def source(self, row):
        tree = Path(row["worktree"])
        if retention.git(tree, "branch", "--show-current").decode().strip() != row["branch"]:
            raise ValueError("source branch changed")
        source = retention.git(tree, "rev-parse", "HEAD").decode().strip()
        if (retention.git(self.root, "rev-parse", "refs/heads/" + row["branch"]).decode().strip() != source
                or not retention.ancestor(tree, row["base"])):
            raise ValueError("source branch reference or allocation baseline changed")
        return source

    def values(self, row, proof=None):
        values = dict(root=str(self.root), state_dir=str(self.directory), path=row["worktree"],
                    worktree=str(Path(row["worktree"]).relative_to(self.root)), ref=row["base"],
                    branch=row["branch"], base=row["base"], issue=row["issue"], repo=self.board.repo,
                    nice=self.board.nice, max_procs=self.board.data["resource_gate"]["max_procs_per_task"])
        values.update(proof or {})
        return values

    def command(self, command, row, proof=None):
        values = self.values(row, proof)
        env = dict(os.environ)
        env.update({key: value.format_map(values) for key, value in self.board.session["command_env"].items()})
        return run(self.board.argv(command, values), cwd=self.root, env=env)

    def process_cwd(self, proc):
        command = self.board.session.get("process_cwd_probe")
        if not command:
            raise ValueError("incomplete host process visibility for PID " + proc.name + "; configure session.process_cwd_probe")
        namespace = os.readlink("/proc/self/ns/pid")
        started = retention_process_start(proc)
        values = dict(root=str(self.root), pid=proc.name, pid_namespace=namespace, start_time=started)
        try:
            reply = json.loads(run(self.board.argv(command, values), cwd=self.root))
        except (OSError, ValueError, subprocess.SubprocessError) as error:
            raise ValueError("process cwd probe for PID " + proc.name + ": " + failure_reason(error)) from None
        if (not isinstance(reply, dict) or reply.get("pid") != int(proc.name) or reply.get("pid_namespace") != namespace
                or reply.get("start_time") != started or retention_process_start(proc) != started
                or not isinstance(reply.get("cwd"), str) or not reply["cwd"].startswith("/")):
            raise ValueError("process cwd probe identity mismatch; original state retained")
        return reply["cwd"]

    def publication(self, row):
        return self.project.publication(dict(row, source=self.source(row)))

    def patch(self, row):
        tree = Path(row["worktree"])
        if not retention.git(tree, "status", "--porcelain", "--untracked-files=all"):
            return None
        names = retention.git(tree, "diff", "--name-only", "-z", "HEAD").split(b"\0")
        names += retention.git(tree, "diff", "--cached", "--name-only", "-z").split(b"\0")
        untracked = retention.git(tree, "ls-files", "--others", "--exclude-standard", "-z").split(b"\0")
        paths = [os.fsdecode(p) for p in names + untracked if p]
        if any(retention.secret_name(p) for p in paths):
            raise ValueError("credential-named change retained without reading or copying")
        for name in paths:
            retention.safe_path(tree, tree / name)
        # Preserve index, working copy and untracked files; never reset originals for cleanup.
        folder = retention.safe_path(self.root, self.board.materials / str(row["issue"]))
        folder.mkdir(parents=True, exist_ok=True)
        for name, args in (("index", ("diff", "--cached", "--binary")), ("worktree", ("diff", "--binary"))):
            data = retention.git(tree, *args)
            digest = hashlib.sha256(data).hexdigest()
            path = retention.safe_path(self.root, folder / f"{name}-{digest}.patch")
            path.write_bytes(data)
            if path.read_bytes() != data:
                raise ValueError("patch readback failed")
        for name in untracked:
            if not name:
                continue
            result = subprocess.run(["git", "diff", "--no-index", "--binary", "--no-ext-diff", "--no-textconv",
                                     "--", "/dev/null", os.fsdecode(name)], cwd=tree, capture_output=True, timeout=60)
            if result.returncode != 1:
                raise ValueError("untracked patch failed; original files retained")
            data = result.stdout
            digest = hashlib.sha256(data).hexdigest()
            path = retention.safe_path(self.root, folder / f"untracked-{digest}.patch")
            path.write_bytes(data)
            if path.read_bytes() != data:
                raise ValueError("patch readback failed")
        return "dirty changes saved as patches; original files retained"

    def reclaim(self, number, apply=False):
        row = self.data["sessions"].get(str(number))
        if row is None:
            return {"issue": number, "state": "unregistered"}
        if row["state"] == "reclaimed":
            if apply:
                self.reclaimed_notice(row)
            return {"issue": number, "state": "reclaimed"}
        try:
            self.board.protect(row)
            self.project.checked_tree(row["branch"])
            if self.issue(number)["state"] != "CLOSED":
                raise ValueError("issue is not closed")
            if not row.get("pane"):
                raise ValueError("incomplete spawn; explicit registration reconciliation required")
            retention.require_host_process_view()
            self.project.guard(row)
            pane, allowed = self.terminal(row)
            if processes(Path(row["worktree"]), allowed, self.process_cwd):
                raise ValueError("workspace has active processes beyond its idle terminal")
            if row["state"] == "waiting-worktree" and not pane:
                if self.project.reclaimed(row):
                    if apply:
                        row["state"] = "reclaimed"; self.save(); self.reclaimed_notice(row)
                    return {"issue": number, "state": "reclaimed"}
            source = self.source(row)
            dirty = retention.git(Path(row["worktree"]), "status", "--porcelain", "--untracked-files=all")
            if not apply:
                return {"issue": number, "state": "eligible", "patch_required": bool(dirty),
                        "worktree": "pending original retention gates"}
            if dirty:
                self.patch(row)
            if pane:
                tail = run(["herdr", "pane", "read", row["pane"], "--source", "recent-unwrapped", "--lines", "80"])
                tail_path = retention.safe_path(self.root, self.directory / "issue-session-tails" / f"{number}-{hashlib.sha256(tail).hexdigest()}.log")
                tail_path.parent.mkdir(parents=True, exist_ok=True)
                if not tail_path.exists():
                    tail_path.write_bytes(tail)
                if tail_path.read_bytes() != tail:
                    raise ValueError("tail readback failed")
                row.update(state="tab-closing", tail=str(tail_path.relative_to(self.root)))
                self.save()
                # Recheck immediately before closing. Only the verified idle TUI and its shell may remain.
                current, allowed = self.terminal(row)
                if not current or processes(Path(row["worktree"]), allowed, self.process_cwd):
                    raise ValueError("terminal/process state changed before close")
                if self.issue(number)["state"] != "CLOSED" or self.source(row) != source:
                    raise ValueError("issue or source changed before close")
                self.project.guard(row)
                self.board.protect(row)
                self.project.checked_tree(row["branch"])
                self.patch(row)
                herdr("tab", "close", row["tab"])
            row["state"] = "waiting-worktree"; self.save()
            # The standard orders tail -> tab close -> complete. Publication and deletion gates stay authoritative.
            proof = self.publication(row)
            self.command(self.board.worktree["retire"], row, proof)
            detail = "尾日志已保存" if row.get("tail") and retention.safe_path(self.root, row["tail"]).is_file() else "tab 已由外部关闭，未补造尾日志"
            self.notice(number, "tab-closed", "已回收会话 tab，" + detail + "；工作树已登记原回收器，实际删除待原调度器核验。")
            if dirty:
                raise ValueError("dirty changes patched; original retention keeps workspace until clean")
            return {"issue": number, "state": "waiting-worktree"}
        except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
            reason = failure_reason(error)
            if apply:
                prefix = "会话 tab 已关闭；工作树暂缓回收：" if row["state"] == "waiting-worktree" else "暂缓回收："
                self.notice(number, "retained", prefix + reason + "。")
            return {"issue": number, "state": "retained", "reason": reason}

    def reclaimed_notice(self, row):
        self.notice(row["issue"], "reclaimed", "已回收会话 tab 和工作树；原回收器已持久登记，来源分支与原始证据保留。")

    def tick(self):
        results = []
        for key, row in self.data["sessions"].items():
            try:
                if row["state"] == "reclaimed":
                    self.reclaimed_notice(row)
                    continue
                if self.issue(int(key))["state"] != "CLOSED":
                    continue
                result = self.reclaim(int(key), True)
            except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
                result = {"issue": int(key), "state": "retained", "reason": failure_reason(error)}
            results.append(result)
            if result["state"] == "retained" and row.get("last_reason") != result["reason"]:
                self.inbox(f"#{key} 回收暂缓：{result['reason']}。登记表 issue-sessions.json；原现场保留。")
                row["last_reason"] = result["reason"]; self.save()
        return results


def composer_state(ansi):
    """Match the existing Codex TUI readiness parser in ops/codex/herdr.ts."""
    for line in reversed(ansi.splitlines()):
        at = line.find("›")
        if at < 0 or re.sub(r"\x1b\[[0-9;]*m", "", line[:at]).strip():
            continue
        rest, dim = line[at + 1:], False
        while rest:
            sgr = re.match(r"\x1b\[([0-9;]*)m", rest)
            if sgr:
                codes = [int(c or 0) for c in sgr[1].split(";")]
                j = 0
                while j < len(codes):
                    code = codes[j]
                    if code in (38, 48, 58) and j + 1 < len(codes):
                        j += 4 if codes[j + 1] == 2 else 2 if codes[j + 1] == 5 else 0
                    elif code in (0, 22):
                        dim = False
                    elif code == 2:
                        dim = True
                    j += 1
                rest = rest[sgr.end():]
            elif rest[0].isspace():
                rest = rest[1:]
            else:
                break
        return "empty" if not rest or dim else "text"
    return "none"


def process_children(proc):
    # Linux reports children per thread; the TUI spawns helpers from worker threads.
    return {child for task in (proc / "task").iterdir()
            for child in (task / "children").read_text().split()}


def idle_codex_helpers(allowed, proc_root=Path("/proc")):
    """Recognize only the idle TUI's bundled code-mode host, never its tool children."""
    helpers = set()
    for pid in allowed:
        proc = proc_root / str(pid)
        try:
            exe = Path(os.readlink(proc / "exe"))
            if exe.name != "codex":
                continue
            expected = exe.with_name("codex-code-mode-host")
            for child_id in process_children(proc):
                child = proc_root / child_id
                fields = (child / "stat").read_text().rpartition(")")[2].split()
                if (fields[1] == str(pid) and Path(os.readlink(child / "exe")) == expected
                        and (child / "cmdline").read_bytes().split(b"\0") == [os.fsencode(expected), b""]
                        and not process_children(child)):
                    helpers.add(int(child_id))
        except FileNotFoundError:
            continue
    return helpers


def retention_process_start(proc):
    return (proc / "stat").read_text().rpartition(")")[2].split()[19]


def processes(tree, allowed, cwd_probe=None):
    """Check host cwd and argv references; do not read credentials, environments or print commands."""
    prefix = os.fsencode(tree)
    for proc in Path("/proc").iterdir():
        if not proc.name.isdigit() or int(proc.name) in allowed:
            continue
        try:
            try:
                cwd = os.fsencode(os.readlink(proc / "cwd"))
            except PermissionError:
                if proc.stat().st_uid != os.getuid():
                    continue
                if not cwd_probe:
                    raise ValueError("incomplete host process visibility")
                cwd = os.fsencode(cwd_probe(proc))
            args = (proc / "cmdline").read_bytes().split(b"\0")
            if cwd == prefix or cwd.startswith(prefix + b"/") or any(
                    arg == prefix or arg.startswith(prefix + b"/") for arg in args):
                return True
        except FileNotFoundError:
            continue
        except PermissionError:
            # Other users' processes are outside this account's issue sessions.
            if proc.stat().st_uid == os.getuid():
                raise ValueError("incomplete host process visibility")
    return False


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=Path(__file__).resolve().parents[1])
    parser.add_argument("--state-dir")
    parser.add_argument("--config", help="project board YAML, default .agents/board.yaml")
    sub = parser.add_subparsers(dest="command", required=True)
    spawn = sub.add_parser("spawn"); spawn.add_argument("issue", type=int); spawn.add_argument("slug")
    reclaim = sub.add_parser("reclaim"); reclaim.add_argument("issue", type=int); reclaim.add_argument("--apply", action="store_true")
    sub.add_parser("tick")
    register = sub.add_parser("register")
    register.add_argument("issue", type=int); register.add_argument("slug"); register.add_argument("--pane", required=True)
    register.add_argument("--base", required=True); register.add_argument("--started-at", required=True)
    args = parser.parse_args()
    root = Path(args.root).resolve()
    board = None
    stage = "board configuration"
    try:
        board = retention.Board(root, args.config)
        directory = retention.safe_path(root, args.state_dir or board.session["state_dir"])
        with retention.locks([directory / "issue-sessions.lock"]):
            stage = "session registry"
            sessions = Sessions(root, directory, args.config)
            stage = args.command
            if hasattr(args, "issue") and not 1 <= args.issue <= 999999999:
                raise ValueError("invalid issue number")
            if args.command == "spawn":
                result = sessions.spawn(args.issue, args.slug)
            elif args.command == "reclaim":
                result = sessions.reclaim(args.issue, args.apply)
            elif args.command == "register":
                result = sessions.register(args.issue, args.slug, args.pane, args.base, args.started_at)
            else:
                result = sessions.tick()
            print(json.dumps(result, ensure_ascii=False))
            return 1 if isinstance(result, dict) and result.get("state") == "retained" else 0
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
        # Keep malformed registries untouched, including when a tick cannot load them.
        reason = stage + ": " + failure_reason(error)
        result = {"state": "retained", "operation": args.command, "stage": stage, "reason": reason}
        if board:
            try:
                with board.inbox.open("a") as handle:
                    handle.write(f"- {retention.stamp()} [issue-session] {args.command} 失败：{reason}；原现场保留。\n")
            except OSError as inbox_error:
                result["inbox_error"] = failure_reason(inbox_error)
        print(json.dumps(result, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
