"""One-shot append-event listener; never polls the game or a database."""
from pathlib import Path
from datetime import datetime
import ctypes
import hashlib
import json
import os
import struct
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
CUT = json.loads((HERE / "data-cut.json").read_bytes())


def save(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def main():
    with (HERE / "listener.once").open("x") as f:
        f.write(str(os.getpid()) + "\n")
    libc = ctypes.CDLL(None, use_errno=True)
    fd = libc.inotify_init1(os.O_CLOEXEC)
    if fd < 0:
        raise OSError(ctypes.get_errno(), "inotify_init1")
    streams, wds = {}, {}
    for item in CUT["files"]:
        path = ROOT / item["path"]
        # Register before reading catch-up bytes, eliminating the startup race.
        wd = libc.inotify_add_watch(fd, os.fsencode(path), 0x2 | 0x8 | 0x400 | 0x800)
        if wd < 0:
            raise OSError(ctypes.get_errno(), str(path))
        streams[item["path"]] = {**item, "cursor": 0, "path_obj": path}
        wds[wd] = item["path"]
    state = {"at": datetime.now().astimezone().isoformat(), "pid": os.getpid(),
             "birth": Path(f"/proc/{os.getpid()}/stat").read_text().rsplit(")", 1)[1].split()[19],
             "method": "blocking inotify read; no periodic polling", "candidates": {},
             "completed": [], "excluded_overlap": [], "release": CUT["release"]}
    save("listener-start.json", state)
    ancestors = {}

    def ancestor(commit):
        if commit not in ancestors:
            ancestors[commit] = bool(commit) and subprocess.run(
                ["git", "merge-base", "--is-ancestor", CUT["release"]["behavior_commit"], commit],
                cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
        return ancestors[commit]

    def consume(name):
        stream = streams[name]
        path = stream["path_obj"]
        assert path.stat().st_ino == stream["inode"], "raw log inode changed; audit required"
        with path.open("rb") as f:
            f.seek(stream["cursor"])
            while True:
                offset = f.tell()
                raw = f.readline()
                if not raw.endswith(b"\n"):
                    break
                stream["cursor"] = f.tell()
                try:
                    row = json.loads(raw)
                except json.JSONDecodeError:
                    if offset < stream["bytes"]:
                        continue
                    raise
                run = row.get("run_id")
                ref = {"path": name, "offset": offset, "bytes": len(raw),
                       "sha256": hashlib.sha256(raw).hexdigest()}
                if name.endswith("run-config.jsonl"):
                    if row.get("ts", "") < CUT["release_cut_utc"]:
                        continue
                    policy = row.get("human_pace") or {}
                    eligible = ((row.get("character") or "").lower() == "silent"
                                and not row.get("restart") and row.get("floor", 999) <= 1
                                and (row.get("loop") or {}).get("mode") == "play"
                                and (row.get("loop") or {}).get("run_start") == "auto"
                                and policy.get("schema") == "human-pace-h1-v1"
                                and policy.get("required_full_replaced") is True
                                and ancestor((row.get("code") or {}).get("commit")))
                    if eligible or run in state["candidates"]:
                        out = HERE / run
                        out.mkdir(exist_ok=True)
                        cfgs = state["candidates"].setdefault(run, {"startup": ref, "segments": [], "terminal": None})
                        (out / f"config-{len(cfgs['segments']):02d}.jsonl").write_bytes(raw)
                        cfgs["segments"].append(ref)
                        print(json.dumps({"event": "startup_or_segment", "run_id": run, "eligible_start": eligible,
                                          "code": row.get("code"), "human_pace": policy}), flush=True)
                elif run in state["candidates"]:
                    (HERE / run / "terminal.jsonl").write_bytes(raw)
                    state["candidates"][run]["terminal"] = ref
                    if run not in state["completed"]:
                        state["completed"].append(run)
                    print(json.dumps({"event": "terminal", "row": row, "reference": ref}), flush=True)
                elif row.get("ended", "") >= CUT["release_cut_utc"]:
                    state["excluded_overlap"].append({"run_id": run, "terminal": ref, "reason": "no qualifying R380 natural startup"})
        state["cursors"] = {k: v["cursor"] for k, v in streams.items()}
        save("listener-state.json", state)

    try:
        for name in streams:
            consume(name)
        print(json.dumps({"event": "armed", "pid": os.getpid(), "completed": state["completed"]}), flush=True)
        while len(state["completed"]) < 2:
            block = os.read(fd, 65536)
            pos, changed = 0, set()
            while pos < len(block):
                wd, mask, cookie, length = struct.unpack_from("iIII", block, pos)
                pos += 16 + length
                if mask & (0x400 | 0x800 | 0x4000):
                    raise RuntimeError(f"log watch invalidated or overflow: {mask}")
                if wd in wds:
                    changed.add(wds[wd])
            # Config before terminal if both append notifications were coalesced.
            for name in sorted(changed, key=lambda x: not x.endswith("run-config.jsonl")):
                consume(name)
        state["finished_at"] = datetime.now().astimezone().isoformat()
        save("two-terminal-events.json", state)
    finally:
        os.close(fd)


if __name__ == "__main__":
    main()
