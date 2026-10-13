"""Read-only capacity checks before allocating reconstructible project output."""
import errno
import os
from pathlib import Path
import shutil
import subprocess
import sys

RESERVE_BYTES = 1 << 30
RESERVE_INODES = 1024
BLOCK_BYTES = 4096


def require_capacity(path, byte_count, file_count=0):
    """Leave room for live logs and receipts; never delete files to make space."""
    parent = Path(path).resolve()
    while not parent.exists():
        parent = parent.parent
    free = shutil.disk_usage(parent).free
    inodes = os.statvfs(parent).f_favail
    if free < byte_count + RESERVE_BYTES or inodes < file_count + RESERVE_INODES:
        raise OSError(errno.ENOSPC,
                      f"insufficient project disk capacity: need {byte_count} bytes/{file_count} files "
                      f"plus reserve {RESERVE_BYTES} bytes/{RESERVE_INODES} inodes; "
                      f"free {free} bytes/{inodes} inodes")


def require_worktree_capacity(root, ref, excluded=()):
    """Estimate checkout allocation from tracked object sizes, without reading file contents."""
    tree = subprocess.run(["git", "-C", str(root), "ls-tree", "-r", "-l", "-z", ref],
                          capture_output=True, check=True).stdout
    byte_count = file_count = 0
    for entry in tree.split(b"\0"):
        if not entry:
            continue
        metadata, name = entry.split(b"\t", 1)
        if any(os.fsdecode(name).startswith(prefix) for prefix in excluded):
            continue
        mode, kind, oid, size = metadata.split()
        if kind != b"blob":
            continue
        file_count += 1
        # Include filesystem rounding and directory/checkout metadata overhead.
        byte_count += ((int(size) + BLOCK_BYTES - 1) // BLOCK_BYTES + 1) * BLOCK_BYTES
    require_capacity(root, byte_count, file_count * 2)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: disk_capacity.py <project> <checkout-ref>")
    try:
        require_worktree_capacity(sys.argv[1], sys.argv[2])
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        print(f"worktree capacity preflight refused: {error}", file=sys.stderr)
        raise SystemExit(1)
