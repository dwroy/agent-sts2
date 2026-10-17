"""One authorized inotify listener: three whole natural H2 runs, no periodic polling."""
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
MIN_CODE = "3910f41b9c3784a70362f63aad5f0994794c68b7"
EARLIEST = "2026-10-17T08:53:06"  # Publication; UTC. Ancestry is the actual gate.


def now():
    return datetime.now().astimezone().isoformat()


def main():
    (HERE / "listener.once").open("x").write(str(os.getpid()) + "\n")
    libc = ctypes.CDLL(None, use_errno=True)
    fd = libc.inotify_init1(os.O_CLOEXEC)
    if fd < 0:
        raise OSError(ctypes.get_errno(), "inotify_init1")
    logdir = ROOT / "logs"
    mask = 0x2 | 0x8 | 0x80 | 0x100 | 0x200 | 0x400 | 0x800
    wd = libc.inotify_add_watch(fd, os.fsencode(logdir), mask)
    if wd < 0:
        raise OSError(ctypes.get_errno(), str(logdir))
    streams = {n: {"path": logdir / (n + ".jsonl"), "cursor": 0, "inode": None}
               for n in ("run-config", "runs")}
    state = {"at": now(), "pid": os.getpid(),
             "birth_ticks": Path(f"/proc/{os.getpid()}/stat").read_text().rsplit(")", 1)[1].split()[19],
             "owner_session": "01a13dcd-83d4-7c63-b233-f93cf878ecf4",
             "request": "roy-20261017-human-pace/H2-natural", "required": 3,
             "minimum_code": MIN_CODE, "method": "directory inotify installed before catch-up; blocking event reads only",
             "configs": {}, "terminals": {}, "admitted": [], "excluded": {}, "errors": []}
    ancestry = {}

    def emit(event):
        event["observed_at"] = now()
        with (HERE / "listener.log").open("a") as out:
            out.write(json.dumps(event, ensure_ascii=False) + "\n")
        print(json.dumps(event, ensure_ascii=False), flush=True)

    def eligible(row):
        reasons = []
        code = (row.get("code") or {}).get("commit", "")
        if code not in ancestry:
            rc = subprocess.run(["git", "merge-base", "--is-ancestor", MIN_CODE, code],
                                cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode
            ancestry[code] = rc == 0
        if not ancestry[code]: reasons.append("code_not_H2_descendant")
        if row.get("character") != "SILENT": reasons.append("not_Silent")
        if row.get("restart") is not False or row.get("floor") != 1: reasons.append("not_fresh_F1_start")
        h2 = row.get("human_pace_h2") or {}
        if h2.get("schema") != "human-pace-h2-shadow-v1" or h2.get("mode") != "shadow": reasons.append("H2_shadow_not_enabled")
        if (row.get("human_pace") or {}).get("budgets", {}).get("boss") != 60000: reasons.append("boss_budget_not_60s")
        return reasons

    def update():
        admitted, excluded = [], {}
        for run, configs in state["configs"].items():
            first = configs[0]["row"]
            reasons = eligible(first)
            if len(configs) != 1: reasons.append("multiple_startup_segments_or_restart")
            if reasons:
                excluded[run] = {"reasons": reasons, "terminal": run in state["terminals"]}
            elif run in state["terminals"]:
                admitted.append(run)
        admitted.sort(key=lambda r: state["configs"][r][0]["row"]["ts"])
        state["admitted"], state["excluded"] = admitted[:3], excluded
        state["ancestry_checks"] = ancestry
        state["streams"] = {n: {k: str(v) if isinstance(v, Path) else v for k, v in s.items()} for n, s in streams.items()}
        state["updated_at"] = now()
        tmp = HERE / "listener-state.tmp"
        tmp.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n")
        tmp.replace(HERE / "listener-state.json")

    def consume(name):
        stream = streams[name]
        path = stream["path"]
        if not path.exists(): return
        st = path.stat()
        if stream["inode"] is not None and st.st_ino != stream["inode"]:
            raise RuntimeError(f"{name}: rotation requires original-prefix audit; do not silently concatenate")
        stream["inode"] = st.st_ino
        if st.st_size < stream["cursor"]: raise RuntimeError(f"{name}: source truncated")
        with path.open("rb") as src:
            src.seek(stream["cursor"])
            while True:
                offset = src.tell()
                raw = src.readline()
                if not raw.endswith(b"\n"): break
                stream["cursor"] = src.tell()
                try: row = json.loads(raw)
                except Exception as error:
                    state["errors"].append({"stream": name, "off": offset, "error": str(error)})
                    continue
                ts = row.get("ts") if name == "run-config" else row.get("ended")
                if not ts or ts < EARLIEST: continue
                run = row.get("run_id")
                if not run: continue
                ref = {"path": str(path.relative_to(ROOT)), "off": offset, "len": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}
                rawdir = HERE / "startup-terminal-originals"
                rawdir.mkdir(exist_ok=True)
                (rawdir / f"{name}-{offset}.jsonl").write_bytes(raw)
                if name == "run-config":
                    state["configs"].setdefault(run, []).append({"row": row, "source": ref})
                    emit({"event": "startup", "run": run, "ts": ts, "code": row.get("code"), "eligibility_reasons": eligible(row)})
                else:
                    prior = state["terminals"].get(run)
                    if prior and prior["source"]["sha256"] != ref["sha256"]:
                        state["errors"].append({"run": run, "reason": "multiple_different_terminal_rows", "source": ref})
                    state["terminals"][run] = {"row": row, "source": ref}
                    emit({"event": "terminal", "run": run, "row": row, "source": ref})
        update()

    try:
        for name in streams: consume(name)
        emit({"event": "armed", "pid": state["pid"], "birth_ticks": state["birth_ticks"], "admitted": state["admitted"]})
        while len(state["admitted"]) < 3:
            block = os.read(fd, 65536)
            pos, changed = 0, set()
            while pos < len(block):
                wd0, flags, cookie, length = struct.unpack_from("iIII", block, pos)
                pos += 16
                name = block[pos:pos + length].rstrip(b"\0").decode(errors="replace")
                pos += length
                if flags & (0x400 | 0x800 | 0x4000): raise RuntimeError(f"watch invalidated/overflow:{flags}")
                if wd0 == wd and name in ("run-config.jsonl", "runs.jsonl"):
                    changed.add(name[:-6])
            for name in sorted(changed, key=lambda n: n != "run-config"): consume(name)
        state["finished_at"] = now()
        update()
        (HERE / "three-terminal-event.json").write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n")
        emit({"event": "three_complete", "runs": state["admitted"]})
    except Exception as error:
        state["errors"].append({"at": now(), "fatal": str(error)})
        update()
        raise
    finally:
        os.close(fd)


if __name__ == "__main__":
    main()
