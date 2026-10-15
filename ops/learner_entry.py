"""Bounded recovery for the observed shared-main import failure, before any learner output."""
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import time


LIMIT = 65536


def lease_identity(root, cwd, batch, state_file):
    """Keep the original registration and owner birth time; uncertainty forbids replay."""
    try:
        if not re.fullmatch(r"[0-9]{8}-[0-9]{6}(?:-(?:s2-)?[a-z-]+)?", batch):
            return None
        file = Path(state_file)
        if not file.is_absolute() or file.name != "learn.json":
            return None
        file.resolve().relative_to((Path(root) / "ops").resolve())
        value = json.loads(file.read_text())["batches"][batch]
        if (value.get("state") != "running" or value.get("cancelled") or value.get("finished")
                or "rc" in value or Path(value.get("worktree", root)).resolve() != Path(cwd).resolve()
                or type(value.get("pid")) is not int or value["pid"] <= 0):
            return None
        stat = Path(f"/proc/{value['pid']}/stat").read_text().rsplit(")", 1)[1].split()
        if stat[0] in ("Z", "X"):
            return None
        return hashlib.sha256(json.dumps([value, stat[19]], sort_keys=True).encode()).hexdigest()
    except (OSError, ValueError, KeyError, IndexError, TypeError):
        return None


def import_conflict(stderr, root):
    """Accept only the frozen top-level esbuild failure; unknown output is terminal."""
    if len(stderr) > LIMIT:
        return False
    try:
        lines = [line for line in stderr.decode("utf8").splitlines() if line.strip()]
    except UnicodeError:
        return False
    diagnostic = re.compile(re.escape(str(Path(root) / "agent/src/core/config.ts"))
                            + r':[0-9]+:[0-9]+: ERROR: Unexpected "<<"')
    if len(lines) < 9 or lines[:4] != ["node:internal/modules/run_main:123",
            "    triggerUncaughtException(", "    ^", "Error: Transform failed with 1 error:"]:
        return False
    if not diagnostic.fullmatch(lines[4]) or lines[-3:-1] != ["  name: 'TransformError'", "}"]:
        return False
    return (re.fullmatch(r"Node\.js v[0-9]+\.[0-9]+\.[0-9]+", lines[-1]) is not None
            and all(re.fullmatch(r"    at .+", line) for line in lines[5:-3])
            and any("/esbuild/lib/main.js:" in line for line in lines[5:-3]))


def launch(root, cwd, batch, state_file, out_path, err_path, command, *, pause=time.sleep):
    identity = lease_identity(root, cwd, batch, state_file)
    command_sha = hashlib.sha256(json.dumps(command).encode()).hexdigest()
    cancelled = 0
    child = None

    def stop(signum, _frame):
        nonlocal cancelled
        cancelled = signum
        if child is not None and child.poll() is None:
            try:
                child.send_signal(signum)
            except ProcessLookupError:
                pass

    previous = {sig: signal.signal(sig, stop) for sig in (signal.SIGINT, signal.SIGTERM)}
    try:
        # Keep normal output live in the original files, including every failed import's exact bytes.
        with open(out_path, "wb") as out, open(err_path, "ab", buffering=0) as err:
            for attempt in range(1, 4):
                if cancelled:
                    return 128 + cancelled
                offset = err.tell()
                child = subprocess.Popen(command, stdout=out, stderr=err)
                rc = child.wait()
                child = None
                size = err.tell() - offset
                with open(err_path, "rb") as source:
                    source.seek(offset)
                    detail = source.read(min(size, LIMIT + 1))
                replay = (not cancelled and rc == 1 and os.fstat(out.fileno()).st_size == 0
                          and size <= LIMIT and import_conflict(detail, root)
                          and identity is not None
                          and lease_identity(root, cwd, batch, state_file) == identity)
                # No timestamps or environment values are needed to bind these attempts.
                with open(str(err_path) + ".entry.jsonl", "a") as journal:
                    journal.write(json.dumps({"attempt": attempt, "batch": batch, "lease": identity,
                        "command_sha256": command_sha, "rc": rc, "stderr_offset": offset,
                        "stderr_bytes": size,
                        "stderr_sha256": hashlib.sha256(detail).hexdigest() if size <= LIMIT else None,
                        "import_conflict": replay,
                        "retry": replay and attempt < 3}) + "\n")
                if not replay or attempt == 3:
                    return 128 + cancelled if cancelled else (128 - rc if rc < 0 else rc)
                pause(5 * attempt)
                if cancelled:
                    return 128 + cancelled
                if lease_identity(root, cwd, batch, state_file) != identity:
                    return rc
    finally:
        for sig, handler in previous.items():
            signal.signal(sig, handler)


def main(argv):
    if len(argv) < 9 or argv[6] != "--":
        return 2
    return launch(*argv[:6], argv[7:])


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
