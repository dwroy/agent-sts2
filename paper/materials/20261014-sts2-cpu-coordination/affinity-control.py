"""Identity-bound, reversible scheduling change for one already running controller."""

import datetime
import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
PID = 2592655
BIRTH = 88377626
CWD = "/home/dw/Projects/agent-sts2/.worktrees/live/agent"
ALLOWED = set(range(30))


def now():
    return datetime.datetime.now().astimezone().isoformat()


def stat(path):
    raw = (path / "stat").read_text()
    fields = raw[raw.rfind(")") + 2:].split()
    return {"state": fields[0], "ppid": int(fields[1]),
            "cpu_ticks": int(fields[11]) + int(fields[12]),
            "nice": int(fields[16]), "birth": int(fields[19])}


def identity():
    path = Path("/proc") / str(PID)
    result = stat(path)
    assert result["birth"] == BIRTH, "controller PID was reused"
    assert os.readlink(path / "cwd") == CWD, "controller checkout changed"
    return path, result


def threads(path):
    result = {}
    for thread in (path / "task").iterdir():
        tid = int(thread.name)
        result[str(tid)] = {**stat(thread), "mask": sorted(os.sched_getaffinity(tid)),
                            "comm": (thread / "comm").read_text().strip()}
    return result


def save(name, value):
    (ROOT / name).write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")


mode = sys.argv[1]
if mode == "apply":
    assert not (ROOT / "before.json").exists(), "immutable original snapshot already exists"
    path, process = identity()
    before = {"at": now(), "pid": PID, "birth": BIRTH, "cwd": CWD,
              "process": process, "threads": threads(path),
              "loadavg": Path("/proc/loadavg").read_text().strip(),
              "cpu_pressure": Path("/proc/pressure/cpu").read_text().strip()}
    assert len(before["threads"]) == 36, "thread membership changed: inspect before applying"
    assert all(row["mask"] == list(range(32)) for row in before["threads"].values()), "existing affinity constraint"
    assert all(row["nice"] == 0 for row in before["threads"].values()), "existing priority changed"
    save("before.json", before)
    changed = []
    try:
        # Restrict the parent first, so subsequently born worker threads inherit the reservation.
        tids = [str(PID)] + sorted(set(before["threads"]) - {str(PID)}, key=int)
        for tid in tids:
            identity()
            current = stat(path / "task" / tid)
            assert current["birth"] == before["threads"][tid]["birth"], "thread identity changed"
            os.sched_setaffinity(int(tid), ALLOWED)
            changed.append(tid)
            assert os.sched_getaffinity(int(tid)) == ALLOWED, "affinity readback mismatch"
        after = threads(path)
        assert set(after) == set(before["threads"]), "membership changed during application"
        assert all(row["mask"] == sorted(ALLOWED) for row in after.values())
        assert all(row["nice"] == before["threads"][tid]["nice"] for tid, row in after.items())
        save("applied.json", {"at": now(), "pid": PID, "birth": BIRTH, "changed_tids": changed,
                              "threads": after, "reserved_cpus": [30, 31],
                              "changed_only_os_affinity": True, "signals_sent": [],
                              "process": identity()[1]})
    except BaseException as error:
        restored = []
        for tid in reversed(changed):
            try:
                identity()
                assert stat(path / "task" / tid)["birth"] == before["threads"][tid]["birth"]
                os.sched_setaffinity(int(tid), before["threads"][tid]["mask"])
                restored.append(tid)
            except (AssertionError, OSError):
                pass
        save("apply-failure.json", {"at": now(), "error": str(error), "restored_tids": restored})
        raise
    print(json.dumps({"pid": PID, "threads_changed": len(changed), "mask": sorted(ALLOWED), "reserved": [30, 31]}))
elif mode == "readback":
    path, process = identity()
    current = threads(path)
    save("readback.json", {"at": now(), "pid": PID, "birth": BIRTH, "process": process,
                           "threads": current, "all_threads_restricted": all(row["mask"] == sorted(ALLOWED) for row in current.values()),
                           "loadavg": Path("/proc/loadavg").read_text().strip(),
                           "cpu_pressure": Path("/proc/pressure/cpu").read_text().strip()})
    print(json.dumps({"pid": PID, "thread_count": len(current), "state": process["state"],
                      "all_threads_restricted": all(row["mask"] == sorted(ALLOWED) for row in current.values())}))
elif mode == "restore":
    original = json.loads((ROOT / "before.json").read_text())
    path, process = identity()
    current = threads(path)
    actions = []
    for tid, row in current.items():
        prior = original["threads"].get(tid)
        if prior is not None:
            assert row["birth"] == prior["birth"], "thread PID was reused; do not overwrite"
            mask = prior["mask"]
        else:
            # New threads inherited the restricted parent mask; the original controller mask is their baseline.
            mask = original["threads"][str(PID)]["mask"]
        assert row["mask"] == sorted(ALLOWED), "another owner changed affinity; do not overwrite"
        identity()
        assert stat(path / "task" / tid)["birth"] == row["birth"]
        os.sched_setaffinity(int(tid), mask)
        assert sorted(os.sched_getaffinity(int(tid))) == mask
        actions.append({"tid": int(tid), "birth": row["birth"], "restored_mask": mask})
    save("restored.json", {"at": now(), "pid": PID, "birth": BIRTH, "actions": actions})
    print(json.dumps({"pid": PID, "threads_restored": len(actions)}))
else:
    raise SystemExit("expected apply, readback, or restore")
