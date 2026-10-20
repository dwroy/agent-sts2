#!/usr/bin/env python3
"""Time the existing refresh commands without recording environment variables."""
from datetime import datetime, timezone
import json
import os
import resource
from pathlib import Path
import subprocess
import sys
import time


def main():
    path, name, *argv = sys.argv[1:]
    started, stamp = time.monotonic(), datetime.now(timezone.utc).isoformat()
    before, load = resource.getrusage(resource.RUSAGE_CHILDREN), os.getloadavg()
    result = subprocess.run(argv, check=False)
    after = resource.getrusage(resource.RUSAGE_CHILDREN)
    row = dict(schema='knowledge-refresh-step-v1', started_at=stamp, ended_at=datetime.now(timezone.utc).isoformat(),
               seconds=time.monotonic()-started, name=name, worker_pid=os.getpid(), exit_code=result.returncode,
               nice=os.nice(0), cpu_user_seconds=after.ru_utime-before.ru_utime,
               cpu_system_seconds=after.ru_stime-before.ru_stime, peak_child_rss_kib=after.ru_maxrss,
               load_start=load, load_end=os.getloadavg())
    with Path(path).open('a') as out:
        out.write(json.dumps(row)+'\n')
    return result.returncode


if __name__ == '__main__':
    raise SystemExit(main())
