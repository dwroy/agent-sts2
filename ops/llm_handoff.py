"""Durable, provider-neutral drain protocol. Adapters own configuration and session creation.

This module never kills a worker, copies credentials, resumes a foreign session, or chooses a model.
All transitions are serialized by the caller's switch lock; admission flags are set under learn.lock.
"""
from contextlib import contextmanager
from datetime import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path


def stamp():
    return datetime.now().astimezone().isoformat(timespec="seconds")


def atomic_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    os.replace(tmp, path)


@contextmanager
def locked(path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield


def request_digest(profile):
    return hashlib.sha256(json.dumps(profile, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


class Handoff:
    """A persisted transaction; snapshots and receipts must come from the selected adapter."""
    def __init__(self, root, ident):
        if not ident or any(c not in "abcdefghijklmnopqrstuvwxyz0123456789-_" for c in ident):
            raise ValueError("invalid switch id")
        self.root = Path(root).resolve()
        self.runtime = self.root / "ops/codex-ops"
        self.path = self.runtime / "llm-switches" / ident / "state.json"
        self.ident = ident

    def read(self):
        return json.loads(self.path.read_text())

    def save(self, state, phase=None, **fields):
        if phase:
            state["phase"] = phase
        state.update(fields)
        state["updated_at"] = stamp()
        atomic_json(self.path, state)
        return state

    def prepare(self, source, target, preflight):
        digest = request_digest(target)
        if self.path.exists():
            current = self.read()
            if current["target_digest"] != digest:
                raise ValueError("switch id already binds a different target")
            return current
        if preflight.get("ok") is not True:
            raise ValueError("target preflight has not passed")
        state = {"id": self.ident, "source": source, "target": target, "target_digest": digest,
                 "preflight": preflight, "created_at": stamp(), "phase": "prepared",
                 "receipts": {}, "owned_flags": [], "preserved_flags": []}
        return self.save(state)

    def begin(self):
        state = self.read()
        if state["phase"] != "prepared":
            return state
        # Scheduler dispatch and completion followups hold this same lock.
        with locked(self.runtime / "learn.lock"):
            # STOP also cancels in-flight brain requests. A drain must never create it.
            for relative in ("ops/codex-ops/LLM_DRAIN", "ops/codex-ops/PAUSE"):
                path = self.root / relative
                if path.exists():
                    if relative in state["owned_flags"] and path.read_text() == self.ident + "\n":
                        continue
                    if relative.endswith("LLM_DRAIN"):
                        raise ValueError("another transaction owns LLM_DRAIN")
                    if relative in state["owned_flags"]:
                        raise ValueError("admission flag ownership changed: " + relative)
                    if relative not in state["preserved_flags"]:
                        state["preserved_flags"].append(relative)
                else:
                    if relative not in state["owned_flags"]:
                        state["owned_flags"].append(relative)
                    # Persist intent before mutation; a crash can be resumed without clearing another owner's flag.
                    self.save(state)
                    path.parent.mkdir(parents=True, exist_ok=True)
                    with path.open("x") as handle:
                        handle.write(self.ident + "\n")
            return self.save(state, "draining")

    def observe(self, snapshot):
        state = self.read()
        if state["phase"] not in ("draining", "ready"):
            return state
        ready = not snapshot.get("active_workers") and snapshot.get("ops_idle") is True \
            and snapshot.get("checkpoint_ready") is True and snapshot.get("inventory_complete") is True
        return self.save(state, "ready" if ready else "draining", snapshot=snapshot)

    def activate(self, adapter, snapshot):
        state = self.observe(snapshot)
        if state["phase"] != "ready":
            raise ValueError("workers or checkpoint are not drained")
        if state["target_digest"] != request_digest(state["target"]):
            raise ValueError("target changed after preflight")
        backup = adapter.backup(state)
        state["receipts"]["backup"] = backup
        self.save(state, "activating")
        try:
            receipt = adapter.activate(state)
        except Exception as error:
            # Configuration rollback precedes any new session. Never roll back over a launched session.
            try:
                rolled_back = adapter.rollback(state, backup)
            except Exception as rollback_error:
                rolled_back = {"configuration_restored": False, "error_type": type(rollback_error).__name__}
            self.save(state, "failed", error_type=type(error).__name__, rolled_back=rolled_back)
            raise
        state["receipts"]["activation"] = receipt
        return self.save(state, "verifying")

    def verified(self, receipt):
        state = self.read()
        if state["phase"] != "verifying":
            raise ValueError("no activation to verify")
        if receipt.get("ok") is not True or receipt.get("target_digest") != state["target_digest"] \
                or not receipt.get("new_session") or receipt.get("new_session") == state["source"].get("session"):
            raise ValueError("new provider session has not been verified")
        state["receipts"]["verification"] = receipt
        return self.save(state, "activated")

    def release(self):
        state = self.read()
        if state["phase"] != "activated":
            raise ValueError("cannot release an unverified handoff")
        with locked(self.runtime / "learn.lock"):
            # Validate the complete set before removing even one flag.
            for relative in state["owned_flags"]:
                path = self.root / relative
                if path.exists() and path.read_text() != self.ident + "\n":
                    raise ValueError("admission flag ownership changed: " + relative)
            for relative in state["owned_flags"]:
                (self.root / relative).unlink(missing_ok=True)
        return self.save(state, "complete")
