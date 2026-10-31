#!/usr/bin/env python3
"""Project bridge into the pinned machine protocol, before project write locks."""
import argparse
from contextlib import contextmanager, nullcontext
import fcntl
import importlib
import json
import os
from pathlib import Path
import re
import sys

from board_queue_pin import local, verify
from issue_session_support import Board


def settings(root):
    board = Board(Path(root).resolve())
    value = board.data['dispatcher'].get('heavy', {})
    if not isinstance(value, dict) or type(value.get('enabled', False)) is not bool:
        raise ValueError('invalid project heavy control')
    return board, value


def inherited(root):
    """Accept only this project's actual request+slot locks, never an env assertion."""
    board, config = settings(root)
    directory = Path(config.get('machine_state', Path.home() / '.local/state/agent-board'))
    if not directory.is_absolute() or '..' in directory.parts or directory.is_symlink():
        raise ValueError('invalid shared machine directory')
    found = {}
    for path in Path('/proc/self/fd').iterdir():
        try:
            target = Path(os.readlink(path))
            if target.parent not in (directory / 'leases', directory / 'slots'):
                continue
            text = Path('/proc/self/fdinfo', path.name).read_text()
            if ' FLOCK ' not in text or ' WRITE ' not in text:
                continue
            if os.fstat(int(path.name)).st_ino != target.stat().st_ino:
                raise ValueError('machine lease descriptor identity differs')
            found[str(target.relative_to(directory))] = int(path.name)
        except FileNotFoundError:
            continue
    leases = [name for name in found if name.startswith('leases/')]
    slots = [name for name in found if name in ('slots/0', 'slots/1')]
    if not found and 'MAS_QUEUE_LEASE_FDS' not in os.environ:
        return ()
    if len(leases) != 1 or len(slots) != 1:
        raise ValueError('incomplete inherited machine leases; refusing nested admission')
    ident = leases[0].split('/')[1]
    if not re.fullmatch('[0-9a-f]{32}', ident):
        raise ValueError('invalid inherited request identity')
    record = json.loads((directory / 'records' / (ident + '.json')).read_text())
    boot = Path('/proc/sys/kernel/random/boot_id').read_text().strip()
    if (record.get('root') != str(board.root) or record.get('repo') != board.repo
            or record.get('boot_id') != boot or record.get('state') != 'running'
            or str(record.get('slot')) != slots[0].split('/')[1]):
        raise ValueError('foreign or nonrunning inherited resource claim')
    pid = os.getpid()
    for _ in range(128):
        fields = Path('/proc', str(pid), 'stat').read_text().rsplit(')', 1)[1].split()
        if pid == record.get('runner_pid') and fields[19] == str(record.get('runner_start')):
            return tuple(found.values())
        if pid <= 1:
            break
        pid = int(fields[1])
    raise ValueError('resource claim owner is not an actual ancestor')


def resource_fds(root):
    path = Path(root) / '.agents/board.yaml'
    if not path.exists() or not settings(root)[1].get('enabled', False):
        return ()
    return inherited(root)


def queued_argv(root, role, command):
    if role not in ('ops', 'integrator', 'learner', 'experiment', 'dev', 'other'):
        raise ValueError('unknown heavy role')
    command = list(map(str, command))
    if not command:
        raise ValueError('foreground command required')
    # Standalone legacy report fixtures/installations have no dispatcher. This
    # does not publish a stopped observation or initialize shared machine state.
    if not (Path(root) / '.agents/board.yaml').exists():
        return command
    board, config = settings(root)
    if not config.get('enabled', False):
        return command
    verify(board.root, board.data['dispatcher']['install'])
    if inherited(root):
        return command
    unlocked(root)
    return [sys.executable, str(local(board.root, 'ops/board_heavy.py')),
            '--root', str(board.root), role, '--', *command]


def unlocked(root):
    """Never wait for a slot while this task/ancestor owns a business lock."""
    root = Path(root).resolve()
    ancestors = set()
    pid = os.getpid()
    for _ in range(128):
        ancestors.add(pid)
        if pid <= 1:
            break
        pid = int(Path('/proc', str(pid), 'stat').read_text().rsplit(')', 1)[1].split()[1])
    inodes = set()
    for name in ('ops/live-merge.lock', 'ops/knowledge-refresh.lock', 'ops/codex-ops/learn.lock',
                 'ops/codex-ops/game-admission.lock'):
        path = local(root, name)
        if path.exists():
            info = path.stat()
            inodes.add((os.major(info.st_dev), os.minor(info.st_dev), info.st_ino))
    for line in Path('/proc/locks').read_text().splitlines():
        fields = line.split()
        if '->' in fields or len(fields) < 6 or fields[1] != 'FLOCK':
            continue
        device = fields[5].split(':')
        if ((int(device[0], 16), int(device[1], 16), int(device[2])) in inodes
                and int(fields[4]) in ancestors):
            raise ValueError('resource admission under a business lock; defer to an unlocked source-check owner')


@contextmanager
def source_lock(root):
    """Original fallback verification lock, preceded by machine admission only."""
    root = Path(root).resolve()
    enabled = (root / '.agents/board.yaml').exists() and settings(root)[1].get('enabled', False)
    claim = source_claim(root) if enabled else nullcontext(())
    with claim as descriptors:
        with open(local(root, 'ops/integrator-full-check.lock'), 'a', encoding='utf8') as full:
            fcntl.flock(full, fcntl.LOCK_EX)
            with open(local(root, 'ops/live-merge.lock'), 'a', encoding='utf8') as handle:
                handle.queue_fds = (*descriptors, full.fileno())
                yield handle


@contextmanager
def source_claim(root):
    board, config = settings(root)
    verify(board.root, board.data['dispatcher']['install'])
    descriptors = inherited(root)
    if descriptors:
        yield descriptors
        return
    unlocked(root)
    kit = local(board.root, board.data['dispatcher']['install'])
    sys.path.insert(0, str(kit))
    try:
        heavy = importlib.import_module('heavy')
        engine = importlib.import_module('board')
        if Path(heavy.__file__).resolve() != kit / 'heavy.py' or Path(engine.__file__).resolve() != kit / 'board.py':
            raise ValueError('mixed machine admission modules')
        with heavy.admission(engine.Board(board.root), 'integrator', ['source-check'], cwd=board.root) as (claim, _):
            yield claim.descriptors()
    finally:
        sys.path.pop(0)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('role', choices=('game', 'ops', 'integrator', 'learner', 'experiment', 'dev', 'other'))
    parser.add_argument('command', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command[1:] if args.command[:1] == ['--'] else args.command
    if not command:
        parser.error('foreground command required')
    board, config = settings(args.root)
    if not config.get('enabled', False):
        os.execvp(command[0], command)
    verify(board.root, board.data['dispatcher']['install'])
    descriptors = inherited(board.root) if args.role != 'game' else ()
    if descriptors:
        for fd in descriptors:
            os.set_inheritable(fd, True)
        os.execvp(command[0], command)
    script = local(board.root, Path(board.data['dispatcher']['install']) / 'heavy.py')
    prefix = ['game', '--root', str(board.root)] if args.role == 'game' else ['--root', str(board.root), args.role]
    # Replace, preserving the original game reservation PID and no extra wrapper.
    os.execv(sys.executable, [sys.executable, str(script), *prefix, '--', *command])


if __name__ == '__main__':
    main()
