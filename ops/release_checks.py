#!/usr/bin/env python3
"""Queued full checks and exact-tree reuse for integration/publication."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

from board_heavy import admission
from issue_session_support import Board, atomic, safe_path, stamp


def tree(worktree):
    subprocess.run(['git', 'diff', '--quiet'], cwd=worktree, check=True)
    return subprocess.check_output(['git', 'write-tree'], cwd=worktree, text=True).strip()


def reusable(path, root, repo, expected):
    path = safe_path(root, path)
    if not path.exists():
        return None
    raw = path.read_bytes()
    value = json.loads(raw)
    if not isinstance(value, dict):
        return None
    if (value.get('schema') != 'board-full-checks-v1' or value.get('root') != str(root)
            or value.get('repo') != repo or value.get('tree') != expected
            or value.get('full_suite') is not True or value.get('input_unchanged') is not True
            or value.get('state') not in ('passed', 'reused')
            or value.get('role') not in ('ops', 'integrator')
            or not isinstance(value.get('results'), dict)
            or any(type(value.get('results', {}).get(k)) is not int for k in ('tsc','vitest'))
            or value.get('results') != {'tsc': 0, 'vitest': 0}):
        return None
    return dict(path=str(Path(path)), sha256=hashlib.sha256(raw).hexdigest(), tree=expected)


def check(root, worktree, receipt, role='ops', reuse=None, runner=subprocess.run):
    root, worktree = Path(root).resolve(), Path(worktree).resolve()
    board = Board(root)
    worktree = safe_path(root, worktree)
    receipt = safe_path(root, receipt)
    common = lambda p: Path(subprocess.check_output(['git','rev-parse','--path-format=absolute','--git-common-dir'], cwd=p, text=True).strip()).resolve()
    if common(root) != common(worktree):
        raise ValueError('check worktree belongs to another repository')
    if role not in ('ops', 'integrator') or receipt.exists():
        raise ValueError('new receipt and check role required')
    value = dict(schema='board-full-checks-v1', root=str(root), repo=board.repo,
        worktree=str(worktree), role=role, full_suite=True, state='queued', queued_at=stamp(), results={})
    receipt.parent.mkdir(parents=True, exist_ok=True)
    with receipt.open('x') as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write('\n'); handle.flush(); os.fsync(handle.fileno())
    try:
        # Admission precedes the original publication lock: no lock inversion while waiting.
        with admission(root, role, 'exact-tree-full-checks'):
            with (root / 'ops/live-merge.lock').open('a') as lock:
                fcntl.flock(lock, fcntl.LOCK_EX)
                expected = tree(worktree); value['tree'] = expected
                proof = reusable(reuse, root, board.repo, expected) if reuse else None
                if proof:
                    value.update(state='reused', results=dict(tsc=0, vitest=0), input_unchanged=True, reused_from=proof)
                else:
                    value.update(state='running', started_at=stamp()); atomic(receipt, value)
                    env = {**os.environ, 'PATH': str(Path.home()/'.local/node/bin')+':'+os.environ.get('PATH','')}
                    commands = [('tsc', ['node','node_modules/typescript/bin/tsc','-p','tsconfig.json','--noEmit']),
                        ('vitest', ['node','node_modules/vitest/vitest.mjs','run','--pool=forks','--maxWorkers=1','--no-file-parallelism'])]
                    for name, argv in commands:
                        with receipt.with_suffix('.'+name+'.log').open('wb') as log:
                            result = runner(['nice','-n','19', *argv], cwd=worktree/'agent', env=env,
                                stdout=log, stderr=subprocess.STDOUT)
                        value['results'][name] = result.returncode; atomic(receipt, value)
                        if result.returncode:
                            raise ValueError('full check failed; original output retained')
                    value['input_unchanged'] = tree(worktree) == expected
                    if not value['input_unchanged']:
                        raise ValueError('checked tree changed')
                    value['state'] = 'passed'
                value['ended_at'] = stamp(); atomic(receipt, value)
        return 0
    except (OSError, ValueError, KeyError, subprocess.SubprocessError) as error:
        value.update(state='failed-retain-original', error=type(error).__name__, ended_at=stamp())
        atomic(receipt, value)
        return 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True); parser.add_argument('--worktree', required=True)
    parser.add_argument('--receipt', required=True); parser.add_argument('--reuse')
    parser.add_argument('--role', choices=['ops','integrator'], default='ops')
    args = parser.parse_args()
    try:
        return check(args.root,args.worktree,args.receipt,args.role,args.reuse)
    except (OSError, ValueError, KeyError, subprocess.SubprocessError):
        print('release checks retained; inspect original receipt, queue and tree', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
