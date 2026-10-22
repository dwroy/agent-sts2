"""Acquire a set of advisory locks without holding any lock while waiting for another."""
import fcntl
from pathlib import Path


def acquire_all(paths, on_wait=None):
    names = [str(Path(p)) for p in paths]
    if len(names) != len(set(names)):
        raise ValueError("duplicate lock path")
    handles = [open(p, "a") for p in names]
    try:
        while True:
            held = []
            blocked = None
            for handle in handles:
                try:
                    fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    held.append(handle)
                except BlockingIOError:
                    blocked = handle
                    break
            if blocked is None:
                return handles
            for handle in reversed(held):
                fcntl.flock(handle, fcntl.LOCK_UN)
            if on_wait:
                on_wait(blocked.name, [])
            # A kernel wait on one lock is an admission notification, never a hold-and-wait edge.
            fcntl.flock(blocked, fcntl.LOCK_EX)
            fcntl.flock(blocked, fcntl.LOCK_UN)
    except BaseException:
        for handle in handles:
            handle.close()
        raise
