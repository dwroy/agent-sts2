#!/usr/bin/env python3
"""Read this project's verified migration declarations, game reservations and locks."""
import argparse
import importlib
import json
import os
from pathlib import Path
import re
import sys

from board_queue_pin import local, verify
from issue_session_support import Board


def process(row, proc=Path('/proc')):
    if (type(row.get('pid')) is not int or row['pid'] <= 1
            or not isinstance(row.get('start'), str) or not row['start'].isdigit()):
        raise ValueError('invalid process identity')
    try:
        fields = (proc / str(row['pid']) / 'stat').read_text().rsplit(')', 1)[1].split()
    except FileNotFoundError:
        return None
    if len(fields) < 20:
        raise ValueError('incomplete process identity')
    if fields[0] in ('Z', 'X') or fields[19] != row['start']:
        return None
    return int(fields[1])


def deduplicate(rows, proc=Path('/proc')):
    unique = {}
    for row in rows:
        if process(row, proc) is not None:
            unique.setdefault(row['pid'], row)
    rows = unique
    result = []
    for pid, row in rows.items():
        parent = process(row, proc)
        for _ in range(128):
            if parent in rows:
                break
            if parent <= 1:
                result.append(row)
                break
            try:
                fields = (proc / str(parent) / 'stat').read_text().rsplit(')', 1)[1].split()
            except FileNotFoundError:
                # A disappearing parent is unknown; retry at the next original tick.
                raise ValueError('resource ancestry changed while probing') from None
            parent = int(fields[1])
        else:
            raise ValueError('resource ancestry exceeds bound')
    return sorted(result, key=lambda row: row['pid'])


def probe(root, proc=Path('/proc')):
    root = Path(root).resolve()
    boot = (proc / 'sys/kernel/random/boot_id').read_text().strip()
    declaration = local(root, 'ops/codex-ops/board-resource-bindings.json')
    value = json.loads(declaration.read_text())
    if (value.get('schema') != 'sts2-board-resource-bindings-v1' or value.get('root') != str(root)
            or value.get('boot_id') != boot or value.get('complete') is not True
            or value.get('owner') != 'ops' or not isinstance(value.get('legacy'), list)
            or not re.fullmatch('[0-9a-f]{64}', value.get('inventory_sha256', ''))):
        raise ValueError('missing, incomplete or rebound resource migration declaration')
    legacy = []
    for row in value['legacy']:
        if (row.get('boot_id') != boot or row.get('role') not in ('ops', 'integrator', 'learner', 'experiment', 'dev', 'other')
                or not isinstance(row.get('task'), str) or '\n' in row['task']):
            raise ValueError('invalid legacy migration identity')
        if process(row, proc) is not None:
            legacy.append({key: row[key] for key in ('pid', 'start', 'role', 'task')})
    # Read only known project lock owners. Kernel waiters (->) are not executing slots.
    inodes = set()
    for name in ('ops/integrator-full-check.lock', 'ops/knowledge-refresh.lock'):
        path = local(root, name)
        if path.exists():
            info = path.stat()
            inodes.add((os.major(info.st_dev), os.minor(info.st_dev), info.st_ino))
    for line in (proc / 'locks').read_text().splitlines():
        fields = line.split()
        if '->' in fields or len(fields) < 6 or fields[1] != 'FLOCK':
            continue
        device = fields[5].split(':')
        if len(device) != 3:
            raise ValueError('invalid kernel lock identity')
        if (int(device[0], 16), int(device[1], 16), int(device[2])) not in inodes:
            continue
        pid = int(fields[4])
        try:
            data = (proc / str(pid) / 'stat').read_text().rsplit(')', 1)[1].split()
        except FileNotFoundError:
            raise ValueError('project lock owner changed while probing') from None
        legacy.append(dict(pid=pid, start=data[19], role='other', task='project-lock'))
    games = []
    reservations = local(root, 'ops/codex-ops/game-admissions')
    if not reservations.is_dir():
        raise ValueError('original game reservation source missing; status unknown')
    for path in reservations.glob('*.json'):
        row = json.loads(local(root, path).read_text())
        identity = dict(pid=row['pid'], start=row['pid_birth'])
        if process(identity, proc) is not None:
            if path.stem != str(identity['pid']):
                raise ValueError('game reservation filename differs')
            games.append(identity)
    return dict(running=bool(games), pids=deduplicate(games, proc), legacy=deduplicate(legacy, proc))


def _publish(board, observed):
    kit = local(board.root, board.data['dispatcher']['install'])
    sys.path.insert(0, str(kit))
    try:
        engine = importlib.import_module('board')
        machine = importlib.import_module('machine')
        if Path(engine.__file__).resolve() != kit / 'board.py' or Path(machine.__file__).resolve() != kit / 'machine.py':
            raise ValueError('mixed machine observation modules')
        state = machine.State(engine.Board(board.root))
        state.initialize()
        with state.guard():
            state.publication(observed)
    finally:
        sys.path.pop(0)


def publish(root):
    """Explicit ops bootstrap: publish current game/legacy before enabling claims."""
    root = Path(root).resolve()
    if not local(root, '.git').is_dir():
        raise ValueError('resource publication belongs to the primary project root')
    board = Board(root)
    heavy = board.data['dispatcher'].get('heavy', {})
    directory = heavy.get('machine_state')
    if not isinstance(directory, str) or not Path(directory).is_absolute():
        raise ValueError('explicit owner-approved machine_state required before publication')
    observed = probe(root)  # Missing/unknown facts never initialize shared state.
    verify(root, board.data['dispatcher']['install'])
    _publish(board, observed)
    return dict(schema='sts2-board-resource-publication-v1', published=True,
                pids=observed['pids'], legacy=observed['legacy'], heavy_enabled=heavy.get('enabled', False))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('--publish', action='store_true', help='original ops only: publish this project before enabling claims')
    args = parser.parse_args()
    print(json.dumps(publish(args.root) if args.publish else probe(args.root)))


if __name__ == '__main__':
    main()
