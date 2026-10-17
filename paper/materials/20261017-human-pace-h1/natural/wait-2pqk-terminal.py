"""One authorized, blocking terminal listener for 2PQK; no game/database polling."""
from pathlib import Path
from datetime import datetime
import ctypes
import hashlib
import json
import os
import struct

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
OUT = HERE / "resume-25mf-2pqk"
RUN = "2PQK67ULZY90"


def main():
    OUT.mkdir(exist_ok=True)
    (OUT / "listener.once").open("x").write(str(os.getpid()) + "\n")
    libc = ctypes.CDLL(None, use_errno=True)
    fd = libc.inotify_init1(os.O_CLOEXEC)
    if fd < 0:
        raise OSError(ctypes.get_errno(), "inotify_init1")
    streams = {}
    for name in ("run-config", "runs"):
        path = ROOT / "logs" / (name + ".jsonl")
        wd = libc.inotify_add_watch(fd, os.fsencode(path), 0x2 | 0x8 | 0x400 | 0x800)
        if wd < 0:
            raise OSError(ctypes.get_errno(), str(path))
        streams[wd] = {"name": name, "path": path, "cursor": 0, "inode": path.stat().st_ino}
    state = {"at": datetime.now().astimezone().isoformat(), "run_id": RUN,
             "pid": os.getpid(), "birth": Path(f"/proc/{os.getpid()}/stat").read_text().rsplit(")", 1)[1].split()[19],
             "method": "blocking inotify; watches installed before catch-up; no periodic game/database reads",
             "old_listener": "finished after mechanical terminals 5H83 and 25MF; never restarted",
             "configs": [], "terminal": None}

    def emit(event):
        line = json.dumps(event, ensure_ascii=False)
        with (OUT / "listener.log").open("a") as f:
            f.write(line + "\n")
        print(line, flush=True)

    def save():
        (OUT / "listener-state.json").write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n")

    def consume(stream):
        assert stream["path"].stat().st_ino == stream["inode"], "source inode changed"
        with stream["path"].open("rb") as f:
            f.seek(stream["cursor"])
            while True:
                offset = f.tell()
                raw = f.readline()
                if not raw.endswith(b"\n"):
                    break
                stream["cursor"] = f.tell()
                if RUN.encode() not in raw:
                    continue
                row = json.loads(raw)
                if row.get("run_id") != RUN:
                    continue
                ref = {"path": str(stream["path"].relative_to(ROOT)), "off": offset,
                       "len": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}
                if stream["name"] == "run-config":
                    (OUT / f"2PQK-config-{len(state['configs']):02d}.jsonl").write_bytes(raw)
                    state["configs"].append(ref)
                    emit({"event": "config", "at": row.get("ts"), "restart": row.get("restart"), "source": ref})
                else:
                    (OUT / "2PQK-terminal.jsonl").write_bytes(raw)
                    state["terminal"] = ref
                    state["finished_at"] = datetime.now().astimezone().isoformat()
                    emit({"event": "terminal", "row": row, "source": ref})
        state["cursors"] = {s["name"]: s["cursor"] for s in streams.values()}
        save()

    try:
        for stream in streams.values():
            consume(stream)
        emit({"event": "armed", "pid": state["pid"], "birth": state["birth"], "terminal_already_present": bool(state["terminal"])})
        while state["terminal"] is None:
            block = os.read(fd, 65536)
            pos, changed = 0, set()
            while pos < len(block):
                wd, mask, cookie, length = struct.unpack_from("iIII", block, pos)
                pos += 16 + length
                if mask & (0x400 | 0x800 | 0x4000):
                    raise RuntimeError(f"watch invalidated/overflow: {mask}")
                if wd in streams:
                    changed.add(wd)
            for wd in sorted(changed, key=lambda w: streams[w]["name"] != "run-config"):
                consume(streams[wd])
        (OUT / "terminal-event.json").write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n")
    finally:
        os.close(fd)


if __name__ == "__main__":
    main()
