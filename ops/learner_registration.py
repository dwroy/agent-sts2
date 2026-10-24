"""Per-batch publication barriers inside the original scheduler transaction."""
from contextlib import contextmanager
from contextvars import ContextVar
import fcntl
from pathlib import Path
import re

_transaction = ContextVar("learner_registration_transaction", default=None)


@contextmanager
def transaction(directory, persist):
    current = {"directory": Path(directory).resolve(), "persist": persist, "pending": {}}
    token = _transaction.set(current)
    try:
        yield
    finally:
        # Parent failure releases only the barrier, never fabricates registration.
        # Every child still has to capture its original saved PID/batch lease.
        for row in current["pending"].values():
            row["lock"].close()
        _transaction.reset(token)


def reserve(directory, label):
    current = _transaction.get()
    if current is None:
        return None
    if Path(directory).resolve() != current["directory"] or not label.startswith("learner-"):
        raise ValueError("registration transaction identity mismatch")
    batch = label.removeprefix("learner-")
    if re.fullmatch(r"[0-9]{8}-[0-9]{6}-postmortem", batch):
        batch = batch.removesuffix("-postmortem")
    if not re.fullmatch(r"[0-9]{8}-[0-9]{6}(?:-[a-z0-9-]+)?", batch) or batch in current["pending"]:
        raise ValueError("duplicate or invalid registration barrier")
    path = current["directory"] / "learner/registration" / (batch + ".lock")
    path.parent.mkdir(parents=True, exist_ok=True)
    lock = path.open("a")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BaseException:
        lock.close()
        raise
    row = {"batch": batch, "path": str(path), "lock": lock, "pid": None}
    current["pending"][batch] = row
    return row


def abort(row):
    if row is not None:
        _transaction.get()["pending"].pop(row["batch"])["lock"].close()


def published(state):
    """Called only after learn.json has been atomically persisted and fsynced."""
    current = _transaction.get()
    if current is None:
        return
    for batch, row in list(current["pending"].items()):
        saved = state["batches"].get(batch, {})
        if saved.get("external_source"):
            binding = saved.get("external_binding", {})
            if (binding.get("plan_id") != saved["external_source"] or not binding.get("dispatch_base")
                    or saved.get("external_lane") not in ("A", "B", "C", "D") or not saved.get("external_policy")):
                continue
        if row["pid"] is not None and saved.get("pid") == row["pid"] and saved.get("state") == "running":
            row["lock"].close()
            del current["pending"][batch]


def checkpoint(state):
    current = _transaction.get()
    if current is not None:
        current["persist"](state)
