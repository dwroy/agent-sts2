"""Wait once on the existing terminal log; no timer, model, game poll or scheduler."""
from pathlib import Path
from datetime import datetime
import hashlib
import json
import os
import subprocess

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
RUN = "FD8NZAHU7SNY"
OUT = HERE / f"natural-{RUN}"


def save(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def auth_metadata():
    path = ROOT / "ops/codex-ops/accounts/codex1/brain/auth.json"
    link = path.lstat()
    target = path.resolve()
    st = target.stat()  # Never open authentication contents.
    return {"path": str(path), "target": str(target), "link_inode": link.st_ino,
            "link_mtime_ns": link.st_mtime_ns, "link_ctime_ns": link.st_ctime_ns,
            "target_inode": st.st_ino, "target_mtime_ns": st.st_mtime_ns, "target_ctime_ns": st.st_ctime_ns}


def main():
    assert not (OUT / "terminal-event.json").exists(), "terminal evidence already exists"
    lock = OUT / "terminal-wait.once"
    # Do not launch a second listener on automatic goal continuation.
    with lock.open("x") as handle:
        handle.write(str(os.getpid()) + "\n")
    raw_stat = Path(f"/proc/{os.getpid()}/stat").read_text()
    fields = raw_stat[raw_stat.rfind(")") + 2:].split()
    bounds = json.loads((OUT / "log-start-bounds.json").read_bytes())
    bound = next(row for row in bounds["files"] if row["path"] == "logs/runs.jsonl")
    source = ROOT / bound["path"]
    inode = source.stat().st_ino
    cursor = bound["lower_bound"]
    command = ["tail", "-c", f"+{cursor + 1}", "-f", str(source)]
    child = subprocess.Popen(command, stdout=subprocess.PIPE)
    save("terminal-wait-start.json", {"at": datetime.now().astimezone().isoformat(),
         "run_id": RUN, "pid": os.getpid(), "birth": int(fields[19]), "tail_pid": child.pid,
         "command": command, "source_inode": inode, "lower_bound": cursor,
         "scope": "one foreground read-only terminal-log listener; exits after this run; no model or game calls"})
    print(json.dumps({"run_id": RUN, "pid": os.getpid(), "birth": int(fields[19]), "waiting_on": bound["path"]}), flush=True)
    try:
        assert child.stdout is not None
        for raw in iter(child.stdout.readline, b""):
            offset = cursor
            cursor += len(raw)
            if RUN.encode() not in raw:
                continue
            entry = json.loads(raw)
            if entry.get("run_id") != RUN:
                continue
            assert raw.endswith(b"\n") and source.stat().st_ino == inode
            with source.open("rb") as handle:
                handle.seek(offset)
                assert handle.read(len(raw)) == raw
            (OUT / "terminal-row.jsonl").write_bytes(raw)
            before = json.loads((OUT / "controller-account-start.json").read_bytes())
            after = auth_metadata()
            save("terminal-account-metadata.json", {"at": datetime.now().astimezone().isoformat(),
                 "run_id": RUN, "auth_link": after, "auth_link_metadata_unchanged": after == before["auth_link"],
                 "credentials_not_read": True, "scope": "terminal metadata endpoint only; native per-call admission remains pending"})
            result = {"at": datetime.now().astimezone().isoformat(), "run_id": RUN,
                 "source": {"path": bound["path"], "offset": offset, "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()},
                 "original_terminal_row_frozen": True, "native_and_consumer_audit_complete": False,
                 "natural_gate": False, "model_calls": 0, "game_actions": 0}
            save("terminal-event.json", result)
            print(json.dumps(result), flush=True)
            return
        raise RuntimeError("terminal log listener exited before the requested event")
    finally:
        if child.poll() is None:
            child.terminate()  # Only the one tail child owned by this script.
            child.wait()


if __name__ == "__main__":
    main()
