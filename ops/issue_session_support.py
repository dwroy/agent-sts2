"""Portable journal helpers and project-owned board configuration."""
from contextlib import contextmanager
import datetime as dt
import fcntl
import fnmatch
import importlib.util
import json
import os
from pathlib import Path
import re
import shlex
import subprocess

SHA = re.compile(r"[0-9a-f]{40}")


def stamp():
    return dt.datetime.now().astimezone().isoformat(timespec="seconds")


def load(path):
    return json.loads(Path(path).read_bytes())


def atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    with tmp.open("w") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
        handle.write("\n"); handle.flush(); os.fsync(handle.fileno())
    os.replace(tmp, path)


def git(root, *args):
    result = subprocess.run(["git", "-C", str(root), *args], capture_output=True, timeout=60)
    if result.returncode:
        raise ValueError("git " + args[0] + " refused")
    return result.stdout


def ancestor(repo, commit):
    return bool(SHA.fullmatch(commit or "")) and subprocess.run(
        ["git", "-C", str(repo), "merge-base", "--is-ancestor", commit, "HEAD"],
        capture_output=True, timeout=20).returncode == 0


def safe_path(root, path):
    path = Path(path)
    path = path if path.is_absolute() else root / path
    if not path.is_relative_to(root) or ".." in path.parts:
        raise ValueError("path outside this runtime")
    current = root
    for part in path.relative_to(root).parts:
        current /= part
        if current.is_symlink():
            raise ValueError("symlink path retained")
    return path


def secret_name(path):
    return any(fnmatch.fnmatch(part.lower(), pattern) for part in Path(path).parts for pattern in
               [".env", ".env.*", "*.env", "auth.json", "*.pem", "*.key", ".*api_key*", ".*env*"])


@contextmanager
def locks(paths):
    handles = []
    try:
        for path in sorted(set(Path(p) for p in paths)):
            path.parent.mkdir(parents=True, exist_ok=True)
            handle = path.open("a"); handles.append(handle)
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield
    finally:
        for handle in reversed(handles):
            handle.close()


def require_host_process_view():
    if Path("/proc/1/comm").read_text().strip() not in ("systemd", "init"):
        raise ValueError("host process visibility required for reclamation")


class Board:
    def __init__(self, root, path=None):
        self.root = root
        path = safe_path(root, path or ".agents/board.yaml")
        try:
            import yaml
        except ImportError:
            # JSON is a YAML subset and needs no additional runtime package.
            self.data = load(path)
        else:
            try:
                self.data = yaml.safe_load(path.read_text())
            except yaml.YAMLError:
                raise ValueError("invalid board YAML; no actions taken") from None
        if not isinstance(self.data, dict):
            raise ValueError("board configuration must be a mapping")
        for name in ("worktree", "roles", "resource_gate", "session"):
            if not isinstance(self.data.get(name), dict):
                raise ValueError("board sections must be mappings")
        if not isinstance(self.data["roles"].get("dev"), dict):
            raise ValueError("developer role must be a mapping")
        self.repo = self.data["repo"]
        self.workspace = self.data["herdr_workspace"]
        self.worktree = self.data["worktree"]
        self.dev = self.data["roles"]["dev"]
        self.session = self.data["session"]
        if (not isinstance(self.repo, str) or not re.fullmatch(r"[\w.-]+/[\w.-]+", self.repo)
                or not isinstance(self.workspace, str) or not self.workspace
                or self.dev.get("kind") != "codex"):
            raise ValueError("unsupported board identity or developer kind")
        self.owner = self.data.get("owner_login", self.repo.split("/")[0])
        if not isinstance(self.owner, str) or not re.fullmatch(r"[\w-]+", self.owner):
            raise ValueError("invalid board owner")
        self.trees = safe_path(root, self.worktree["root"])
        if self.trees == root:
            raise ValueError("worktree root must be an isolated directory")
        self.inbox = safe_path(root, self.session["inbox"])
        self.materials = safe_path(root, self.session["materials"])
        self.nice = self.data["resource_gate"]["nice"]
        if type(self.nice) is not int or not 0 <= self.nice <= 19:
            raise ValueError("invalid board priority")
        # The dispatcher runs once per host; local /proc cannot prove a remote pane idle.
        if self.data.get("machine"):
            raise ValueError("remote machine requires a host-local dispatcher and process guard")
        for key in ("allocate", "retire"):
            self.argv(self.worktree[key], {})
        if not isinstance(self.worktree["prepare"], list):
            raise ValueError("prepare must be a list of commands")
        for command in self.worktree["prepare"]:
            self.argv(command, {})
        if (not isinstance(self.worktree.get("base_ref"), str)
                or not self.worktree["base_ref"].startswith("refs/heads/")):
            raise ValueError("explicit base branch reference required")
        safe_path(root, self.session["state_dir"])
        if "process_cwd_probe" in self.session:
            self.argv(self.session["process_cwd_probe"], {})
        if not isinstance(self.session.get("command_env"), dict) or not all(
                isinstance(key, str) and re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key) and isinstance(value, str)
                for key, value in self.session["command_env"].items()):
            raise ValueError("command environment must be a string mapping")
        if (not isinstance(self.session.get("prompt"), str) or not self.session["prompt"]
                or not re.fullmatch(r"\[[\w #*-]+\]", self.session.get("comment_prefix", ""))):
            raise ValueError("opening prompt and role comment prefix required")
        for value in (self.data["resource_gate"]["max_procs_per_task"], self.dev["max_parallel"]):
            if type(value) is not int or value < 1:
                raise ValueError("positive resource limits required")
        for key in ("model", "effort"):
            if not isinstance(self.dev.get(key), str) or not self.dev[key]:
                raise ValueError("developer model and effort required")
        if not isinstance(self.data.get("never_reclaim"), list) or not isinstance(self.data.get("verify"), list):
            raise ValueError("board protection and verification lists required")
        if not all(isinstance(x, str) for x in self.data["never_reclaim"] + self.data["verify"]):
            raise ValueError("board protection and verification entries must be strings")
        if not all(isinstance(role, dict) for role in self.data["roles"].values()):
            raise ValueError("board roles must be mappings")

    def argv(self, command, values):
        tokens = shlex.split(command) if isinstance(command, str) else command
        if not isinstance(tokens, list) or not tokens or not all(isinstance(t, str) and t for t in tokens):
            raise ValueError("board command must be a nonempty argv or command string")
        if not values:
            return tokens
        try:
            return [token.format_map(values) for token in tokens]
        except (KeyError, ValueError):
            raise ValueError("unknown board command placeholder") from None

    def project(self, directory):
        path = safe_path(self.root, self.worktree["adapter"])
        spec = importlib.util.spec_from_file_location("issue_session_project_adapter", path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module.Project(self.root, directory)

    def protect(self, row):
        relative = str(Path(row["worktree"]).relative_to(self.root))
        roles = self.data["roles"]
        for rule in self.data["never_reclaim"]:
            if not isinstance(rule, str):
                raise ValueError("invalid board protection rule")
            if rule.startswith("panes:"):
                for role in rule.split(":", 1)[1].split(","):
                    role = role.strip()
                    if fnmatch.fnmatch(row["label"], role) or row.get("pane") == roles.get(role, {}).get("pane", "unset"):
                        raise ValueError("protected board role or pane")
            elif fnmatch.fnmatch(relative, rule.rstrip("/") + "/*") or fnmatch.fnmatch(relative, rule):
                raise ValueError("protected board worktree")
