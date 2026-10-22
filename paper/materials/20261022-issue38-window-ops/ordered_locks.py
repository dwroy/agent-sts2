"""The original check's total order matches refresh K->L and completion O->D."""
import fcntl
from pathlib import Path

ORDER = ('knowledge-refresh.lock', 'ordinary-close.lock', 'paper-dataset.lock', 'tick-snapshot.lock', 'live-merge.lock')


def acquire_ordered(paths, on_wait=None):
    paths = [Path(p) for p in paths]
    if tuple(p.name for p in paths) != ORDER or len(set(map(str, paths))) != len(paths):
        raise ValueError('the original complete lock order is required')
    handles = []
    try:
        for path in paths:
            handle = path.open('a')
            handles.append(handle)
            try:
                fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                if on_wait:
                    on_wait(str(path), [f.name for f in handles[:-1]])
                fcntl.flock(handle, fcntl.LOCK_EX)
        return handles
    except BaseException:
        for handle in reversed(handles):
            handle.close()
        raise
