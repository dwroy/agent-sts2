"""Finite read-only inotify observer for this goal; no polling, game control or scheduler."""
import ctypes
from datetime import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import select
import struct
import time

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "paper/materials/20261015-v5-s-completion/post-on-events"
RELEASE = ROOT / "paper/materials/20261015-v5-s-completion/resume-1615"
OUT.mkdir(exist_ok=True)
FILES = {n: ROOT / "logs" / f"{n}.jsonl" for n in ["run-config", "brain", "decisions", "runs"]}
positions = {n: p.stat().st_size for n, p in FILES.items()}
active = None
bosses = set()
seen_release = {}
seen_consumer = set()


def event(kind, **value):
    row = {"at": datetime.now().astimezone().isoformat(), "kind": kind, **value}
    with (OUT / "events.jsonl").open("a") as handle:
        handle.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(json.dumps(row, ensure_ascii=False), flush=True)


def account(pid, run, suffix):
    path = OUT / f"account-{pid}-{suffix}.json"
    proc = Path(f"/proc/{pid}")
    value = {"at": datetime.now().astimezone().isoformat(), "run_id": run, "pid": pid}
    try:
        stat = (proc / "stat").read_text()
        fields = stat[stat.rfind(")") + 2:].split()
        env = dict(x.split("=", 1) for x in (proc / "environ").read_bytes().decode().split("\0") if "=" in x)
        home = env.get("BRAIN_CODEX_HOME")
        auth = Path(home) / "auth.json"
        link, target = auth.lstat(), auth.resolve()
        target_stat = target.stat()
        value.update({"birth": fields[19], "cwd": str((proc / "cwd").resolve()), "brain_home": home,
                      "environment": {k: env[k] for k in ["BRAIN_CODEX_HOME", "BRAIN_CODEX_MODEL", "BRAIN_CODEX_EFFORT"] if k in env},
                      "auth_link": {"path": str(auth), "target": str(target), "link_inode": link.st_ino,
                                    "link_mtime_ns": link.st_mtime_ns, "link_ctime_ns": link.st_ctime_ns,
                                    "target_inode": target_stat.st_ino, "target_mtime_ns": target_stat.st_mtime_ns,
                                    "target_ctime_ns": target_stat.st_ctime_ns}, "credentials_not_read": True,
                      "process_observed_alive": True})
    except (OSError, TypeError, ValueError) as error:
        value.update({"process_observed_alive": False, "unknown": type(error).__name__})
    with path.open("x") as handle:
        handle.write(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    return str(path.relative_to(ROOT))


def releases():
    for name in ["ops-received.json", "ops-publication-receipt.json"]:
        p = RELEASE / name
        if not p.exists():
            continue
        raw = p.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        if seen_release.get(name) == digest:
            continue
        try:
            json.loads(raw)
        except ValueError:
            continue
        seen_release[name] = digest
        event("ops_receipt", path=str(p.relative_to(ROOT)), sha256=digest)


def consume(name):
    global active
    p = FILES[name]
    with p.open("rb") as handle:
        handle.seek(positions[name])
        while True:
            offset = handle.tell()
            raw = handle.readline()
            if not raw or not raw.endswith(b"\n"):
                break
            positions[name] = handle.tell()
            row = json.loads(raw)
            ref = {"path": str(p.relative_to(ROOT)), "offset": offset, "bytes": len(raw),
                   "sha256": hashlib.sha256(raw).hexdigest()}
            if name == "run-config":
                loop = row.get("loop") or {}
                if row.get("character") == "SILENT" and loop.get("s_build_rank") == loop.get("sim_adaptive") == "on":
                    active = row
                    pid = row["process"]["pid"]
                    event("natural_on_start", run_id=row["run_id"], source=ref, code=row.get("code"),
                          account_proof=account(pid, row["run_id"], "start"))
            if not active or row.get("run_id") != active["run_id"]:
                continue
            if name == "brain":
                qid = row.get("question_id") or ""
                match = re.fullmatch(r"[a-z0-9]+-(\d+)-(\d+)", qid)
                proof = account(int(match[1]), row["run_id"], f"brain-{match[2]}") if match else None
                event("on_native_brain", run_id=row["run_id"], question_id=qid, engine=row.get("engine"),
                      model=row.get("model"), effort=row.get("effort"), accepted=row.get("accepted"),
                      source=ref, account_proof=proof)
            if name == "decisions":
                sim = row.get("boss_sim") or {}
                p2 = sim.get("build_ranking") or {}
                completion = sim.get("completion") or {}
                if p2.get("mode") == "on" and "P2" not in seen_consumer:
                    seen_consumer.add("P2")
                    event("first_P2_on_record", run_id=row["run_id"], source=ref, floor=row.get("floor"))
                if completion.get("status") == "complete_adaptive" and "C2" not in seen_consumer:
                    seen_consumer.add("C2")
                    event("first_C2_complete_adaptive", run_id=row["run_id"], source=ref, floor=row.get("floor"))
                if sim.get("available") is True and row.get("floor") not in bosses:
                    bosses.add(row["floor"])
                    event("on_boss_node", run_id=row["run_id"], floor=row["floor"], source=ref)
            if name == "runs":
                event("natural_on_terminal", run_id=row["run_id"], floor=row.get("floor"),
                      ended=row.get("ended"), source=ref)
                return True
    return False


libc = ctypes.CDLL(None, use_errno=True)
fd = libc.inotify_init1(os.O_CLOEXEC)
if fd < 0:
    raise OSError(ctypes.get_errno(), "inotify_init1")
watches = {}
for name, path in FILES.items():
    wd = libc.inotify_add_watch(fd, os.fsencode(path), 0x00000002)
    if wd < 0:
        raise OSError(ctypes.get_errno(), str(path))
    watches[wd] = name
wd = libc.inotify_add_watch(fd, os.fsencode(RELEASE), 0x00000002 | 0x00000008 | 0x00000080 | 0x00000100)
if wd < 0:
    raise OSError(ctypes.get_errno(), str(RELEASE))
watches[wd] = "release"
event("observer_started", pid=os.getpid(), source_positions=positions, deadline_hours=6,
      scope="read-only evidence observer; no game/model/account control or repeated full check")
releases()
deadline = time.monotonic() + 6 * 3600
try:
    while time.monotonic() < deadline:
        ready, _, _ = select.select([fd], [], [], max(0, deadline - time.monotonic()))
        if not ready:
            break
        data = os.read(fd, 65536)
        offset, changed = 0, set()
        while offset < len(data):
            watch, mask, cookie, length = struct.unpack_from("iIII", data, offset)
            offset += 16 + length
            if watch in watches:
                changed.add(watches[watch])
        if "release" in changed:
            releases()
        # The configuration must be consumed before any newly appended native rows.
        for name in ["run-config", "brain", "decisions", "runs"]:
            if name in changed and consume(name):
                raise SystemExit(0)
    event("observer_deadline", no_goal_completion_claim=True)
finally:
    os.close(fd)
