#!/usr/bin/env python3
"""Time the existing refresh commands without recording environment variables."""
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import subprocess
import sys
import time


def main():
    path, name, *argv = sys.argv[1:]
    started, stamp = time.monotonic(), datetime.now(timezone.utc).isoformat()
    result = subprocess.run(argv, check=False)
    row = dict(schema='knowledge-refresh-step-v1', started_at=stamp, ended_at=datetime.now(timezone.utc).isoformat(),
               seconds=time.monotonic()-started, name=name, worker_pid=os.getpid(), exit_code=result.returncode)
    with Path(path).open('a') as out:
        out.write(json.dumps(row)+'\n')
    return result.returncode


if __name__ == '__main__':
    raise SystemExit(main())
