#!/usr/bin/env python3
"""Explicit, bounded read-only ops assistants. No tick, automatic dispatch, merge or learning writes."""
from contextlib import contextmanager
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import tempfile
import time

from learner_jobs import hosting

SCRIPTS = Path(__file__).resolve().parent
ID = re.compile(r"^[a-z][a-z0-9-]{0,47}$")
CHARACTERS = {"ironclad", "silent", "regent", "necrobinder", "defect"}
KINDS = {"event-audit", "source-check", "request-status"}
ACTIVE = {"starting", "running", "orphaned", "launch-uncertain"}
MAX_BYTES = 240_000
MAX_WORKERS = 2


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def encode(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()


def atomic(path, value):
    raw = value if isinstance(value, bytes) else encode(value)
    tmp = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    tmp.write_bytes(raw)
    os.replace(tmp, path)


def regular(path, base, limit=MAX_BYTES):
    """Reject every symlink component, traversal and non-regular input before reading."""
    relative = path.relative_to(base)
    if any(p in ("", ".", "..") for p in relative.parts):
        raise ValueError("path traversal")
    current = base
    if current.is_symlink():
        raise ValueError("symlink base")
    for part in relative.parts:
        current /= part
        if current.is_symlink():
            raise ValueError("symlink input")
    if not path.is_file() or path.stat().st_size > limit:
        raise ValueError("input missing, non-regular or too large")
    with path.open("rb") as handle:
        raw = handle.read(limit + 1)
    if len(raw) > limit or b"\x00" in raw:
        raise ValueError("oversize or binary input")
    raw.decode("utf8")
    return raw


def identity(pid, allow_zombie=False):
    try:
        proc = Path(f"/proc/{int(pid)}")
        stat = (proc / "stat").read_text().rsplit(")", 1)[1].split()
        if stat[0] == "Z" and not allow_zombie:
            return None
        return {"pid": int(pid), "start": stat[19], "uid": proc.stat().st_uid,
                "boot": Path("/proc/sys/kernel/random/boot_id").read_text().strip(), "session": int(stat[3])}
    except (OSError, ValueError):
        return None


def alive(saved):
    return bool(saved and identity(saved.get("pid")) == saved)


def engine_members(saved):
    """An engine owns a private session; retain its slot even if its CLI wrapper exits first."""
    if not saved:
        return []
    found = [saved] if alive(saved) else []
    if saved.get("session") != saved["pid"]:
        return found
    for path in Path("/proc").iterdir():
        if not path.name.isdigit():
            continue
        child = identity(int(path.name))
        if (child and child["session"] == saved["pid"] and child["boot"] == saved["boot"]
                and child["uid"] == saved["uid"] and int(child["start"]) >= int(saved["start"]) and child not in found):
            found.append(child)
    return found


def stop_engine(saved):
    # Signal verified PIDs, never process names or unrelated groups.
    for sig, wait in ((signal.SIGTERM, 2), (signal.SIGKILL, 2)):
        members = engine_members(saved)
        for member in members:
            if alive(member):
                try:
                    os.kill(member["pid"], sig)
                except ProcessLookupError:
                    pass
        until = time.monotonic() + wait
        while time.monotonic() < until:
            if not engine_members(saved):
                return True
            time.sleep(.05)
    return not engine_members(saved)


def git_snapshot(root, args):
    # Pipe to a bounded read from a temporary file; never allocate a huge git patch in memory.
    with tempfile.TemporaryFile() as out:
        result = subprocess.run(["git", "--no-pager", "-C", str(root), *args], stdout=out, stderr=subprocess.PIPE,
                                timeout=20, env={**os.environ, "GIT_OPTIONAL_LOCKS": "0"})
        out.seek(0)
        raw = out.read(MAX_BYTES + 1)
    if result.returncode or len(raw) > MAX_BYTES:
        raise ValueError("git evidence unavailable or too large; split source task")
    return raw


class Assist:
    def __init__(self, root, state):
        self.root = Path(root).absolute()
        self.state = Path(state).absolute()
        # Runtime must be in the authorized repository, never an arbitrary caller-supplied path.
        self.state.relative_to(self.root)
        self.base = self.state / "assist"
        for path in (self.state, self.base, self.base / "requests", self.base / "jobs", self.state / "queue"):
            if path.is_symlink() or path.resolve() != path:
                raise ValueError("runtime path must not contain symlinks")
            path.mkdir(parents=True, exist_ok=True)

    @contextmanager
    def lock(self):
        with (self.base / "assist.lock").open("a") as handle:
            fcntl.flock(handle, fcntl.LOCK_EX)
            yield

    def job(self, request_id):
        if not isinstance(request_id, str) or not ID.fullmatch(request_id):
            raise ValueError("request id must match [a-z][a-z0-9-]{0,47}")
        path = self.base / "jobs" / request_id
        if path.is_symlink():
            raise ValueError("symlink job")
        return path

    def save(self, job, state):
        atomic(job / "state.json", state)
        with (job / "history.jsonl").open("ab") as handle:
            handle.write(json.dumps({"at_ns": time.time_ns(), **state}, ensure_ascii=False).encode() + b"\n")

    def publish(self, job, state):
        # Persistent outbox: mark the claim before publishing. If killed in the gap, status recovers it.
        if state.get("event_sent"):
            return
        if not state.get("event_name"):
            state["event_name"] = f"{time.time_ns()}-ops-assist-done.md"
            self.save(job, state)
        event = self.state / "queue" / state["event_name"]
        if not event.exists() and not (self.state / "delivered" / state["event_name"]).exists():
            content = (f"只读辅助核查 {state['request_id']} / {state['character']}：{state['status']}。\n"
                       f"回执：{job / 'state.json'}；报告/失败原件在同目录。\n"
                       "仅辅助核查回报，不表示原请求完成、合入或上线；原事件/台账未修改。主 ops 重新核实后串行处理。\n")
            atomic(event, content.encode())
        state["event_sent"] = True
        self.save(job, state)

    def reconcile(self):
        states = []
        for job in sorted((self.base / "jobs").iterdir()):
            state = json.loads(regular(job / "state.json", self.base))
            if state["status"] in ACTIVE and not alive(state.get("worker")):
                if engine_members(state.get("engine")):
                    state.update(status="orphaned", error="wrapper missing; engine still alive; slot remains occupied")
                    self.save(job, state)
                elif state["status"] == "launch-uncertain":
                    # A failed Herdr transport can have delivered the command. Do not create a duplicate.
                    # A late wrapper must still claim this state under the same lock.
                    if time.time() - state["created"] < 120:
                        states.append(state)
                        continue
                    state.update(status="lost", error="no verified wrapper within launch grace; late workers rejected")
                    self.save(job, state)
                else:
                    state.update(status="lost", error="registered PID identity absent; no completion receipt")
                    self.save(job, state)
            if state["status"] not in ACTIVE:
                self.publish(job, state)
            states.append(state)
        return states

    def validate(self, request_id):
        raw = regular(self.base / "requests" / f"{request_id}.json", self.base, 16_000)
        request = json.loads(raw)
        fields = {"request_id", "character", "kind", "objective", "inputs", "source_commit"}
        if not isinstance(request, dict) or set(request) - fields:
            raise ValueError("unknown request fields")
        if request.get("request_id") != request_id or request.get("character") not in CHARACTERS or request.get("kind") not in KINDS:
            raise ValueError("request id, role or kind mismatch")
        if not isinstance(request.get("objective"), str) or not 1 <= len(request["objective"]) <= 2000:
            raise ValueError("objective must contain 1-2000 characters")
        inputs = request.get("inputs")
        if not isinstance(inputs, list) or not 1 <= len(inputs) <= 24 or len(set(inputs)) != len(inputs):
            raise ValueError("inputs must contain 1-24 unique relative paths")
        frozen = []
        for name in inputs:
            if not isinstance(name, str) or not re.fullmatch(r"[A-Za-z0-9_./-]+", name) or name.startswith("/") or ".." in name.split("/"):
                raise ValueError("invalid evidence path")
            parts = Path(name).parts
            if parts[0] not in {"ops", "notes", "paper", "learner", "knowledge", "docs", "agent"}:
                raise ValueError("unsupported evidence root")
            if any(p.startswith(".") or p == "node_modules" for p in parts) or Path(name).suffix not in {".md", ".json", ".jsonl", ".out", ".err", ".log", ".ts", ".py", ".sh"}:
                raise ValueError("unsupported evidence file")
            if set(parts) & (CHARACTERS - {request["character"]}):
                raise ValueError("cross-character evidence path")
            data = regular(self.root / name, self.root)
            text = data.decode()
            explicit = {char.lower() for char in re.findall(r'(?i)\bcharacter["\']?\s*[:=]\s*["\']?(ironclad|silent|regent|necrobinder|defect)\b', text)}
            if explicit - {request["character"]}:
                raise ValueError("cross-character evidence content; provide a character-specific excerpt")
            if re.search(r'(?:knowledge/characters/|paper/materials/)(?:' + '|'.join(CHARACTERS - {request["character"]}) + r')/', text):
                raise ValueError("cross-character evidence reference")
            frozen.append((name, data))
        sha = request.get("source_commit")
        if request["kind"] == "source-check" and sha is None:
            raise ValueError("source-check requires a fixed source_commit")
        if sha is not None:
            if not isinstance(sha, str) or not re.fullmatch(r"[0-9a-f]{40}", sha):
                raise ValueError("source_commit must be a full SHA")
            # Fixed object, no branch interpolation, no hooks, no external diff/text conversion.
            if git_snapshot(self.root, ["cat-file", "-t", sha]).strip() != b"commit":
                raise ValueError("source_commit is not a commit object")
            changed = git_snapshot(self.root, ["diff-tree", "--root", "--no-commit-id", "--name-only", "-r", "-m", sha, "--"]).decode().splitlines()
            for name in changed:
                parts = Path(name).parts
                if any(p in {".env", ".jev_api_keys", ".deepseek_api_key"} or p.endswith(".env") or p.startswith(".sts2-jev-env") for p in parts) or Path(name).suffix.lower() in {".dll", ".pck"}:
                    raise ValueError("source commit changes a protected file")
                if (name.startswith("knowledge/characters/") or name.startswith("paper/materials/")) and set(parts) & (CHARACTERS - {request["character"]}):
                    raise ValueError("cross-character source data")
            raw_commit = git_snapshot(self.root, ["show", "--no-ext-diff", "--no-textconv", "--format=fuller", "--stat", "--patch", sha, "--"])
            frozen.append((f"git-show-{sha}.txt", raw_commit))
            facts = {"source_commit": sha, "refs": {}}
            for label, tree, ref in (("main", self.root, "main"), ("live", self.root / ".worktrees/live", "HEAD")):
                head = subprocess.run(["git", "-C", str(tree), "rev-parse", "--verify", ref], capture_output=True, timeout=10)
                if head.returncode:
                    facts["refs"][label] = {"available": False}
                    continue
                head_sha = head.stdout.decode().strip()
                ancestor = subprocess.run(["git", "-C", str(self.root), "merge-base", "--is-ancestor", sha, head_sha], capture_output=True, timeout=10)
                facts["refs"][label] = {"head": head_sha, "source_is_ancestor": ancestor.returncode == 0, "check_rc": ancestor.returncode}
            frozen.append(("git-preconditions.json", encode(facts)))
        if sum(len(data) for _, data in frozen) > MAX_BYTES:
            raise ValueError("evidence exceeds 240000 bytes; split the explicit task")
        return raw, request, frozen

    def dispatch(self, request_id):
        job = self.job(request_id)
        with self.lock():
            if (self.state / "LLM_DRAIN").exists():
                raise ValueError("LLM drain: auxiliary admission is held")
            states = self.reconcile()
            if job.exists():
                raise ValueError("duplicate request id; prior request and failure are retained")
            if sum(s["status"] in ACTIVE for s in states) >= MAX_WORKERS:
                raise ValueError("ops assistant concurrency limit (2)")
            raw, request, frozen = self.validate(request_id)
            job.mkdir()
            inputs = job / "input"
            inputs.mkdir()
            (job / "request.json").write_bytes(raw)
            files = []
            for i, (source, data) in enumerate(frozen):
                name = f"{i:02d}.txt"
                (inputs / name).write_bytes(data)
                files.append({"name": name, "source": source, "sha256": digest(data), "bytes": len(data)})
            manifest = {**request, "files": files, "request_sha256": digest(raw), "frozen_at_ns": time.time_ns()}
            manifest["input_sha256"] = digest(encode(manifest))
            atomic(inputs / "manifest.json", manifest)
            state = {"request_id": request_id, "character": request["character"], "status": "starting", "created": time.time(),
                     "input_sha256": manifest["input_sha256"], "worker": None, "engine": None}
            self.save(job, state)
            try:
                self.start(job, state)
            except Exception as error:
                state.update(status="failed", error=f"launch failed: {type(error).__name__}: {error}")
                self.save(job, state)
                self.publish(job, state)
                raise
            return state

    def start(self, job, state):
        argv = ["nice", "-n", "19", sys.executable, str(SCRIPTS / "ops_assist.py"), "worker", state["request_id"], str(self.root), str(self.state)]
        host = SCRIPTS / "herdr-host.sh"
        env = {**os.environ, "CODEX_OPS_ROOT": str(self.root), "CODEX_OPS_DIR": str(self.state)}
        use_herdr = hosting(str(self.state), "learners", "CODEX_OPS_LEARNER_HOST", "setsid") == "herdr"
        if use_herdr:
            available = subprocess.run(["bash", str(host), "available"], env=env, capture_output=True, timeout=15)
            if available.returncode == 0:
                # No fallback after run: failure may mean an already-delivered pane command.
                label = "ops-assist-" + state["request_id"]
                state.update(status="launch-uncertain", hosting="herdr", label=label,
                             host_state=env.get("HERDR_HOST_STATE", str(self.state / "herdr.json")))
                self.save(job, state)
                try:
                    args = ["bash", str(host), "run", label, "--pidfile", str(job / "host.pid")]
                    for key in ("PATH", "CODEX_HOME", "LEARNER_CODEX_HOME"):
                        if os.environ.get(key):
                            args += ["--env", f"{key}={os.environ[key]}"]
                    result = subprocess.run([*args, "--", *argv], env=env, capture_output=True, timeout=45)
                    (job / "launch.out").write_bytes(result.stdout)
                    (job / "launch.err").write_bytes(result.stderr)
                    if result.returncode == 0:
                        state["pane"] = result.stdout.decode().split()[0]
                    else:
                        state["error"] = f"Herdr launch uncertain: exit {result.returncode}; no duplicate fallback"
                except subprocess.TimeoutExpired as error:
                    (job / "launch.out").write_bytes(error.stdout or b"")
                    (job / "launch.err").write_bytes(error.stderr or b"")
                    state["error"] = "Herdr launch timed out; no duplicate fallback"
                self.save(job, state)
                return
            (job / "launch.err").write_bytes(b"Herdr unavailable; use setsid\n" + available.stderr)
        with (job / "wrapper.out").open("wb") as out, (job / "wrapper.err").open("wb") as err:
            proc = subprocess.Popen(argv, env=env, cwd=self.root, stdin=subprocess.DEVNULL, stdout=out, stderr=err, start_new_session=True)
        state.update(worker=identity(proc.pid), hosting="setsid")
        self.save(job, state)

    def worker(self, request_id):
        job = self.job(request_id)
        with self.lock():
            state = json.loads(regular(job / "state.json", self.base))
            if state["status"] not in {"starting", "launch-uncertain"}:
                raise ValueError("worker already claimed or terminal")
            state.update(status="running", worker=identity(os.getpid()))
            self.save(job, state)
        print(f"ops-assist {request_id}: phase=prepare wrapper_pid={os.getpid()}; output {job}", flush=True)
        rc = 1
        try:
            inputs = job / "input"
            manifest = json.loads(regular(inputs / "manifest.json", job))
            fingerprint = manifest.pop("input_sha256")
            if digest(encode(manifest)) != fingerprint or fingerprint != state["input_sha256"]:
                raise ValueError("input manifest changed")
            manifest["input_sha256"] = fingerprint
            for file in manifest["files"]:
                if digest(regular(inputs / file["name"], inputs)) != file["sha256"]:
                    raise ValueError("frozen evidence changed")
            node = Path.home() / ".local/node/bin/node"
            prepare = subprocess.run([str(node), "--import", str(self.root / "agent/node_modules/tsx/dist/loader.mjs"),
                                      str(SCRIPTS / "codex/assist.ts"), str(self.root), str(inputs)], capture_output=True, timeout=60)
            (job / "prepare.err").write_bytes(prepare.stderr)
            if prepare.returncode:
                raise ValueError(f"command preparation failed: exit {prepare.returncode}")
            plan = json.loads(prepare.stdout)
            command = plan["command"]
            (job / "prompt.txt").write_text(command["stdin"])
            atomic(job / "command.json", {"command": command["command"], "args": command["args"]})
            print(f"ops-assist {request_id}: phase=key-isolation-probe", flush=True)
            with (job / "probe.out").open("wb") as out, (job / "probe.err").open("wb") as err:
                probe = subprocess.run([command["command"], *plan["probe"]], env=plan["env"], cwd=inputs, stdout=out, stderr=err, timeout=40)
            if probe.returncode:
                raise ValueError(f"read-only key/evidence probe failed: exit {probe.returncode}")
            with (job / "stdout.jsonl").open("wb") as out, (job / "stderr.log").open("wb") as err, (job / "prompt.txt").open("rb") as prompt:
                proc = subprocess.Popen([command["command"], *command["args"]], cwd=inputs, env=plan["env"], stdin=prompt, stdout=out, stderr=err, start_new_session=True)
                with self.lock():
                    state["engine"] = identity(proc.pid, allow_zombie=True)
                    self.save(job, state)
                print(f"ops-assist {request_id}: phase=read-only-analysis engine_pid={proc.pid}; stdout {job / 'stdout.jsonl'}", flush=True)
                try:
                    rc = proc.wait(timeout=1800)
                except subprocess.TimeoutExpired:
                    stop_engine(state["engine"])
                    proc.wait(timeout=5)
                    rc = 124
                # A wrapper's rc0 is insufficient while its native child or tool survives.
                if engine_members(state.get("engine")) and not stop_engine(state["engine"]):
                    raise ValueError("engine descendants remain alive")
            # A host-side edit during the model turn cannot silently invalidate the receipt.
            current = json.loads(regular(inputs / "manifest.json", job))
            if current != manifest or any(digest(regular(inputs / f["name"], inputs)) != f["sha256"] for f in manifest["files"]):
                raise ValueError("frozen evidence changed during analysis")
            report = read_completion(job / "stdout.jsonl", rc, manifest)
            atomic(job / "report.json", report)
            state["status"] = "completed" if report["status"] == "complete" else "blocked"
        except Exception as error:
            state.update(status="failed", error=f"{type(error).__name__}: {error}")
        survivors = engine_members(state.get("engine"))
        if survivors:
            state.update(status="orphaned", error="engine descendants remain; slot retained", survivors=survivors)
        state.update(exit_code=rc, finished=time.time())
        with self.lock():
            self.save(job, state)
            if state["status"] not in ACTIVE:
                self.publish(job, state)
        print(f"ops-assist {request_id}: phase=finished status={state['status']}; receipt {job / 'state.json'}; report {job / 'report.json'}", flush=True)
        if state.get("hosting") == "herdr" and state.get("pane") and state["status"] not in ACTIVE:
            # Reuse the host's close/archive policy, after the wrapper exits. No tail/watch process.
            try:
                with (job / "pane-close.log").open("wb") as log:
                    subprocess.Popen(["nice", "-n", "19", "bash", str(SCRIPTS / "herdr-host.sh"), "close", state["label"],
                                      "--pane", state["pane"], "--delay", "2"],
                                     env={**os.environ, "HERDR_HOST_STATE": state["host_state"]}, stdin=subprocess.DEVNULL,
                                     stdout=log, stderr=log, start_new_session=True)
            except OSError as error:
                (job / "pane-close.log").write_text(f"pane cleanup could not start: {error}\n")
        return 0 if state["status"] == "completed" else 1


def read_completion(path, rc, manifest):
    completed, failed, last, session = False, False, None, None
    with path.open() as handle:
        for line in handle:
            row = json.loads(line)
            if row.get("type") == "thread.started":
                session = row.get("thread_id")
            if row.get("type") == "turn.completed":
                completed = True
            if row.get("type") in {"turn.failed", "error"}:
                failed = True
            if row.get("type") == "item.completed" and row.get("item", {}).get("type") == "agent_message":
                last = row["item"].get("text")
    if rc != 0 or failed or not completed or not session or not last:
        raise ValueError("no successful turn plus substantive completion receipt")
    report = json.loads(last)
    for key in ("request_id", "character", "input_sha256"):
        if report.get(key) != manifest[key]:
            raise ValueError(f"report {key} mismatch")
    if report.get("status") not in {"complete", "blocked"}:
        raise ValueError("invalid report status")
    files = {file["name"] for file in manifest["files"]}
    findings = report.get("findings")
    if not isinstance(findings, list) or not findings or any(not isinstance(f, dict) or f.get("input") not in files or not isinstance(f.get("observation"), str) or not f["observation"].strip() for f in findings):
        raise ValueError("report must reference actual evidence and state findings")
    for key in ("limitations", "next_steps"):
        if not isinstance(report.get(key), list) or not all(isinstance(item, str) for item in report[key]):
            raise ValueError(f"report {key} must be a string list")
    return {**report, "session_id": session}


def main():
    action = sys.argv[1] if len(sys.argv) > 1 else ""
    worker = action == "worker" and len(sys.argv) == 5
    root = sys.argv[3] if worker else os.environ.get("CODEX_OPS_ROOT", str(SCRIPTS.parent))
    state = sys.argv[4] if worker else os.environ.get("CODEX_OPS_DIR", str(Path(root) / "ops/codex-ops"))
    manager = Assist(root, state)
    if action == "dispatch" and len(sys.argv) == 3:
        result = manager.dispatch(sys.argv[2])
    elif action == "status" and len(sys.argv) == 2:
        with manager.lock():
            result = manager.reconcile()
    elif worker:
        return manager.worker(sys.argv[2])
    else:
        raise ValueError("usage: ops_assist.py dispatch <id> | status")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        print(f"ops-assist: {type(error).__name__}: {error}", file=sys.stderr)
        sys.exit(2)
