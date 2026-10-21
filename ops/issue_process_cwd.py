#!/usr/bin/env python3
"""Read one inaccessible process cwd, with host/PID reuse checks; never mutate processes."""
import json
import os
from pathlib import Path
import re
import sys


def start_time(pid):
    return (Path('/proc') / str(pid) / 'stat').read_text().rpartition(')')[2].split()[19]


def probe(pid, namespace, started):
    if not re.fullmatch(r'[1-9][0-9]*', pid) or not re.fullmatch(r'[0-9]+', started):
        raise ValueError('invalid process identity')
    actual = os.readlink('/proc/self/ns/pid')
    if actual != namespace or start_time(pid) != started:
        raise ValueError('host/PID identity mismatch')
    cwd = os.readlink('/proc/' + pid + '/cwd')
    if start_time(pid) != started:
        raise ValueError('PID changed during probe')
    return {'pid': int(pid), 'pid_namespace': actual, 'start_time': started, 'cwd': cwd}


if __name__ == '__main__':
    try:
        if len(sys.argv) != 4:
            raise ValueError('pid, namespace and start time required')
        print(json.dumps(probe(*sys.argv[1:])))
    except (OSError, ValueError, IndexError):
        print('{"state":"retained","reason":"process cwd probe could not verify identity"}')
        raise SystemExit(1)
