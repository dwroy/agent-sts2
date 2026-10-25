#!/usr/bin/env python3
"""Read-only managed candidate admission; no deletion, maintenance or new claim."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess

from board_heavy import inherited
from board_queue_pin import local
from disk_capacity import require_worktree_capacity
from worktree_checkout import cold


def admission(root, refs, options):
    root = Path(root).resolve()
    excluded = options['exclude']
    if not shutil.which('node') or not (root / 'agent/node_modules/.package-lock.json').is_file():
        raise ValueError('existing pinned Node provider/runtime required; never install dependencies')
    metadata = json.loads((root / 'agent/node_modules/.package-lock.json').read_text())['packages']
    wanted = json.loads((root / 'agent/package-lock.json').read_text())['packages']
    package = json.loads((root / 'agent/package.json').read_text())
    required = set(package.get('dependencies', {})) | set(package.get('devDependencies', {}))
    if not metadata or any(name not in wanted or any(row.get(key) != wanted[name].get(key)
                          for key in ('version', 'integrity')) for name, row in metadata.items()):
        raise ValueError('installed dependency metadata differs from lock')
    if any('node_modules/' + name not in metadata for name in required):
        raise ValueError('required installed package metadata missing')
    results = []
    for ref in refs:
        require_worktree_capacity(root, ref, excluded=excluded)
        raw = subprocess.check_output(['git', '-C', str(root), 'ls-tree', '-rlz', ref],
                                       pass_fds=tuple(int(fd) for fd in os.environ.get('MAS_QUEUE_LEASE_FDS', '').split(',') if fd))
        fresh = []
        for row in raw.split(b'\0'):
            if not row:
                continue
            meta, name = row.split(b'\t', 1)
            name = os.fsdecode(name)
            if cold(name) and not any(name.startswith(prefix) for prefix in excluded):
                fields = meta.split()
                if fields[1] != b'blob':
                    raise ValueError('unknown cold entry layout')
                fresh.append((name, int(fields[3])))
        limit = options.get('new_materials_max_bytes', 4 << 20)
        if type(limit) is not int or not 0 <= limit <= 4 << 20 or sum(size for _, size in fresh) > limit:
            raise ValueError('new cold snapshot exceeds bounded delivery materials; update frozen exclusions before checkout')
        results.append(dict(ref=ref, fresh_materials=fresh, fresh_bytes=sum(size for _, size in fresh)))
    return dict(schema='sts2-queue-admission-v1', admitted=True, observations=results)


def workspace_refs(root):
    """Find only this inherited worker's frozen job; never scan for the newest job."""
    root = Path(root).resolve()
    if not inherited(root):
        raise ValueError('allocation admission must inherit an existing resource claim')
    for fd in os.environ['MAS_QUEUE_LEASE_FDS'].split(','):
        path = Path(os.readlink('/proc/self/fd/' + fd))
        if path.name != 'worker.lock' or not path.is_relative_to(root):
            continue
        job_path = local(root, path.parent / 'allocation-job.json')
        job = json.loads(job_path.read_text())
        if job.get('root') != str(root) or job.get('schema') != 'mas-workspace-job-v1':
            raise ValueError('foreign inherited workspace job')
        return [job['baseline'], *[row['delivery']['head'] for row in job['members']]]
    raise ValueError('original inherited allocation job unavailable')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    options = json.loads(local(root, '.agents/queue-workspace.json').read_text())
    print(json.dumps(admission(root, workspace_refs(root), options)))


if __name__ == '__main__':
    main()
