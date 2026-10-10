"""Transfer a running play process between verified autoplay shells without stopping play."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import signal
import shutil
import subprocess
import tempfile
import time


class ReloadError(Exception):
    pass


def identity(row):
    return tuple(row[key] for key in ("pid", "uid", "start", "argv", "cwd"))


def process(pid):
    try:
        directory = Path(f"/proc/{pid}")
        fields = (directory / "stat").read_text().rsplit(")", 1)[1].split()
        return {"pid": pid, "uid": directory.stat().st_uid, "start": fields[19], "state": fields[0],
                "argv": tuple(os.fsdecode(arg) for arg in (directory / "cmdline").read_bytes().split(b"\0") if arg),
                "cwd": str((directory / "cwd").resolve(strict=True))}
    except (OSError, ValueError, IndexError):
        return None


class Runtime:
    def __init__(self, root, live, directory):
        self.root, self.live, self.directory = Path(root).resolve(), Path(live).resolve(), Path(directory).resolve()
        self.script = self.root / "ops/autoplay.sh"
        self.uid = os.getuid()
        self.child = None
        self.scratch = None
        self.console_output = None
        self.console_enabled = False

    def kind(self, row):
        if not row or row["state"] == "Z" or not row["argv"]:
            return None
        argv = row["argv"]
        def path(arg):
            return (Path(row["cwd"]) / arg).resolve()
        if Path(argv[0]).name == "bash" and (len(argv) == 2 or (
                len(argv) == 3 and argv[2] == "--tail-console")) and path(argv[1]) == self.script:
            return "autoplay"
        if Path(argv[0]).name == "node":
            # npx and tsx launchers also carry "src/index.ts play" in argv; only the Node entry script owns play.
            index = 1
            while index < len(argv):
                arg = argv[index]
                if arg in ("--eval", "-e", "--print", "-p") or arg.startswith(("--eval=", "--print=")):
                    break
                if arg in ("--require", "-r", "--import", "--loader", "--experimental-loader", "--conditions", "-C"):
                    index += 2
                    continue
                if arg == "--":
                    index += 1
                    if index >= len(argv):
                        break
                    arg = argv[index]
                elif arg.startswith("-"):
                    index += 1
                    continue
                if index + 1 < len(argv) and argv[index + 1] == "play" and path(arg) == self.live / "agent/src/index.ts":
                    return "play"
                break
        for arg in argv[1:]:
            candidate = path(arg)
            if candidate == self.root / "ops/report.py":
                return "report"
            if candidate.parent == self.root / "ops" and candidate.name.startswith("stop-after") and candidate.suffix == ".sh":
                return "stop-after"
        return None

    def rows(self):
        return [row for directory in Path("/proc").iterdir() if directory.name.isdecimal()
                for row in [process(int(directory.name))] if row]

    def check(self, old_pid, play_pid, old=None, play=None, new_pid=None):
        rows = self.rows()
        current = {row["pid"]: row for row in rows}
        for pid, kind, expected in [(old_pid, "autoplay", old), (play_pid, "play", play)]:
            row = current.get(pid)
            if not row or row["uid"] != self.uid or self.kind(row) != kind:
                raise ReloadError(f"拒绝：PID {pid} 不是当前用户的指定 {kind} 进程")
            if expected and identity(row) != identity(expected):
                raise ReloadError(f"拒绝：PID {pid} 的进程身份已变化")
        for row in rows:
            kind = self.kind(row)
            if kind in ("report", "stop-after") or (kind == "play" and row["pid"] != play_pid) or (
                    kind == "autoplay" and row["pid"] not in (old_pid, new_pid)):
                raise ReloadError(f"拒绝：另有 {kind} 进程 PID {row['pid']}")
        return current[old_pid], current[play_pid]

    def version(self):
        def head(path):
            value = subprocess.check_output(["git", "-C", str(path), "rev-parse", "HEAD"], text=True, timeout=3).strip()
            if len(value) != 40 or any(c not in "0123456789abcdef" for c in value):
                raise ReloadError("无法确认脚本版本")
            return value
        return {"ops_commit": head(self.root), "live_commit": head(self.live),
                "autoplay_sha256": hashlib.sha256(self.script.read_bytes()).hexdigest()}

    def preflight(self, old_pid):
        if self.pidfile().read_text().strip() != str(old_pid):
            raise ReloadError("拒绝：autoplay.pid 与指定旧 PID 不一致")
        if (self.root / "ops/STOP").exists():
            raise ReloadError("拒绝：ops/STOP 存在")
        subprocess.run(["bash", "-n", str(self.script)], check=True, timeout=3, capture_output=True)
        old = process(old_pid)
        if old and old["argv"][-1] == "--tail-console" and self.console_output is None:
            # Keep the existing terminal open through takeover and any recovery; never stop play for a viewer repair.
            self.console_output = open(f"/proc/{old_pid}/fd/1", "wb", buffering=0)
            if not os.isatty(self.console_output.fileno()):
                self.console_output.close()
                self.console_output = None
                raise ReloadError("拒绝：日志循环 stdout 不是原标签页的终端")
            self.console_enabled = True

    def pidfile(self):
        return self.directory / "autoplay.pid"

    def publish(self, pid):
        path = self.pidfile()
        temporary = path.with_name(path.name + f".reload-{os.getpid()}")
        try:
            temporary.write_text(str(pid) + "\n")
            temporary.replace(path)
        finally:
            temporary.unlink(missing_ok=True)

    def forget(self, pid):
        if self.pidfile().read_text().strip() == str(pid):
            self.pidfile().unlink()

    def same(self, row):
        current = process(row["pid"])
        return current and current["state"] != "Z" and identity(current) == identity(row)

    def send(self, row, sig):
        if not self.same(row):
            raise ReloadError(f"PID {row['pid']} 已结束或身份变化；没有发送信号")
        os.kill(row["pid"], sig)

    def wait(self, predicate):
        deadline = time.monotonic() + 3
        while not predicate():
            if time.monotonic() >= deadline:
                raise ReloadError("交接确认超时")
            time.sleep(0.05)

    def stopped(self, row):
        current = process(row["pid"])
        return self.same(row) and current["state"] in ("T", "t")

    def start(self, play_pid, old):
        self.scratch = Path(tempfile.mkdtemp(prefix="autoplay-reload-", dir=self.directory))
        ready = self.scratch / "ready"
        self.release = self.scratch / "release"
        self.active = self.scratch / "active"
        command = ["bash", str(self.script)] + (["--tail-console"] if self.console_enabled else [])
        self.child = subprocess.Popen(command, cwd=self.root,
            env={**os.environ, "WAIT_PID": str(play_pid), "AUTOPLAY_READY": str(ready),
                 "AUTOPLAY_RELEASE": str(self.release), "AUTOPLAY_ACTIVE": str(self.active),
                 "AUTOPLAY_RELOAD_PARENT": str(os.getpid()), "AUTOPLAY_RELOAD_OLD": str(old["pid"]),
                 "AUTOPLAY_RELOAD_OLD_START": old["start"]},
            stdin=subprocess.DEVNULL, stdout=self.console_output if self.console_enabled else subprocess.DEVNULL,
            stderr=self.console_output if self.console_enabled else subprocess.DEVNULL,
            start_new_session=True)
        def acknowledged():
            if self.child.poll() is not None:
                raise ReloadError("新 autoplay 在就绪前退出")
            return ready.exists() and ready.read_text().strip() == str(self.child.pid)
        self.wait(acknowledged)
        row = process(self.child.pid)
        if not row or row["uid"] != self.uid or self.kind(row) != "autoplay":
            raise ReloadError("新 autoplay 的进程身份不符")
        return row

    def permit(self):
        self.release.touch()

    def wait_active(self):
        def active():
            if self.child.poll() is not None:
                raise ReloadError("新 autoplay 在激活前退出")
            return self.active.exists() and self.active.read_text().strip() == str(self.child.pid)
        self.wait(active)

    def abort(self):
        # Only our newly created child is signalled. Its play process is never touched.
        if self.child and self.child.poll() is None:
            self.child.kill()
            self.child.wait(timeout=1)

    def cleanup(self):
        if self.scratch:
            shutil.rmtree(self.scratch)
            self.scratch = None

    def recover(self, play, old, version):
        if not self.same(play) or self.version() != version or any(self.kind(row) in (
                "autoplay", "report", "stop-after") or (self.kind(row) == "play" and identity(row) != identity(play))
                for row in self.rows()):
            raise ReloadError("无法安全恢复：进程或版本已变化")
        self.cleanup()
        new = self.start(play["pid"], old)
        self.publish(new["pid"])
        self.permit()
        self.wait_active()
        return new


def reload_autoplay(runtime, old_pid, play_pid):
    if any(type(pid) is not int or pid <= 1 for pid in (old_pid, play_pid)) or old_pid == play_pid:
        raise ReloadError("需要两个不同的有效 PID")
    old, play = runtime.check(old_pid, play_pid)
    runtime.preflight(old_pid)
    version = runtime.version()
    frozen = published = terminated = completed = False
    new = None
    try:
        runtime.check(old_pid, play_pid, old, play)
        # Stop only the shell while the new shell acknowledges WAIT_PID. Play keeps running.
        runtime.send(old, signal.SIGSTOP)
        frozen = True
        runtime.wait(lambda: runtime.stopped(old))
        new = runtime.start(play_pid, old)
        runtime.check(old_pid, play_pid, old, play, new["pid"])
        runtime.preflight(old_pid)
        if not runtime.same(new) or runtime.version() != version:
            raise ReloadError("脚本或 live 版本在交接期间变化")
        runtime.publish(new["pid"])
        published = True
        # If the broker exits after retiring the old shell, the staged shell can still take over.
        runtime.permit()
        runtime.send(old, signal.SIGTERM)
        terminated = True
        if runtime.same(old):
            runtime.send(old, signal.SIGCONT)
        runtime.wait(lambda: not runtime.same(old))
        runtime.wait_active()
        if not runtime.same(new):
            raise ReloadError("新 autoplay 在确认后退出")
        completed = True
        return {"old_pid": old_pid, "play_pid": play_pid, "new_pid": new["pid"], **version}
    except Exception as error:
        if not terminated:
            rollback_errors = []
            try:
                runtime.abort()
            except Exception as rollback:
                rollback_errors.append(str(rollback))
            old_alive = runtime.same(old)
            if frozen and old_alive:
                runtime.send(old, signal.SIGCONT)
            if published:
                try:
                    if old_alive:
                        runtime.publish(old_pid)
                    else:
                        runtime.forget(new["pid"])
                except Exception as rollback:
                    rollback_errors.append(str(rollback))
            detail = f"；收尾需核实：{rollback_errors}" if rollback_errors else ""
            if not old_alive:
                raise ReloadError(f"交接失败，旧循环 PID {old_pid} 已结束或身份变化；未给替代 PID 发信号；"
                                  f"play PID {play_pid} 未停，需运维以 WAIT_PID 恢复：{error}") from error
            raise ReloadError(f"交接失败，已恢复旧循环 PID {old_pid}；play PID {play_pid} 未停：{error}{detail}") from error
        if not runtime.same(old) and not runtime.same(new):
            try:
                restored = runtime.recover(play, old, version)
            except Exception as recovery:
                raise ReloadError(f"交接及恢复失败，play PID {play_pid} 未停；需运维以 WAIT_PID 恢复；"
                                  f"原错误：{error}；恢复错误：{recovery}") from recovery
            runtime.cleanup()
            raise ReloadError(f"交接失败后已恢复循环 PID {restored['pid']}，WAIT_PID={play_pid}，版本 {version}：{error}") from error
        # A delayed old exit keeps the existing owner; the new shell remains behind its startup barrier.
        raise ReloadError(f"交接待确认；旧循环 PID {old_pid}，准备的新循环 PID {new['pid']}，play PID {play_pid} 未停；"
                          f"新循环只在旧循环结束后接管，需运维核实；版本 {version}：{error}") from error
    finally:
        # Preserve the barrier paths while a permitted takeover is still pending.
        if not terminated or completed:
            runtime.cleanup()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root"); parser.add_argument("live"); parser.add_argument("directory")
    parser.add_argument("old_pid", type=int); parser.add_argument("play_pid", type=int)
    args = parser.parse_args()
    runtime = Runtime(args.root, args.live, args.directory)
    # A broker timeout must take the same rollback path as an ordinary pre-commit failure.
    def interrupted(signum, frame):
        raise ReloadError("broker 中断交接")
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    try:
        with open(runtime.directory / "autoplay-reload.lock", "a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            receipt = reload_autoplay(runtime, args.old_pid, args.play_pid)
        print(json.dumps(receipt, ensure_ascii=False))
        return 0
    except (ReloadError, OSError, subprocess.SubprocessError) as error:
        print(str(error))
        return 1
    finally:
        if runtime.console_output is not None:
            runtime.console_output.close()


if __name__ == "__main__":
    raise SystemExit(main())
