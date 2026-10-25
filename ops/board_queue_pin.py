#!/usr/bin/env python3
"""Export or verify the complete reviewed kit; never replace an installed directory."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess


def local(root, name):
    root = Path(root).resolve()
    path = Path(name)
    if not path.is_absolute():
        path = root / path
    if '..' in path.parts or not path.is_relative_to(root) or path == root:
        raise ValueError('project-local path required')
    for parent in (path, *path.parents):
        if parent == root:
            break
        if parent.is_symlink():
            raise ValueError('symlink in protected project path')
    return path


def sha(data):
    return hashlib.sha256(data).hexdigest()


def manifest(root):
    value = json.loads(local(root, '.agents/board-kit-pin.json').read_text())
    if (value.get('schema') != 'sts2-board-kit-pin-v1' or value.get('repo') != 'dwroy/agent-board-kit'
            or not re.fullmatch('[0-9a-f]{40}', value.get('commit', ''))
            or not isinstance(value.get('files'), dict) or not value['files']):
        raise ValueError('invalid kit pin')
    required = {'board.py', 'watchdog.py', 'polling.py', 'conversation.py', 'machine.py',
                'heavy.py', 'merge_queue.py', 'queue_workspace.py', 'queue_checks.py'}
    if not required <= {name for name in value['files'] if name.endswith('.py')}:
        raise ValueError('complete fixed kit module set required')
    for name, checksum in value['files'].items():
        local(root, name)
        if not re.fullmatch('[0-9a-f]{64}', checksum):
            raise ValueError('invalid kit file fingerprint')
    return value


def verify(root, directory):
    value = manifest(root)
    directory = local(root, directory)
    for name, checksum in value['files'].items():
        path = local(directory, name)
        if not path.is_file() or sha(path.read_bytes()) != checksum:
            raise ValueError('kit file missing or differs: ' + name)
    actual = {p.name for p in directory.glob('*.py') if not p.name.startswith('test_')}
    expected = {p for p in value['files'] if p.endswith('.py')}
    if actual != expected:
        raise ValueError('mixed kit executable modules')
    return dict(schema='sts2-board-kit-verification-v1', commit=value['commit'],
                files=value['files'], verified=True)


def export(root, source, destination):
    """Read only fixed Git objects, validate all bytes, then create a NEW staging path."""
    value = manifest(root)
    destination = local(root, destination)
    if destination.exists():
        raise ValueError('existing destination retained; export needs a new staging path')
    blobs = {}
    for name, checksum in value['files'].items():
        data = subprocess.check_output(['git', '-C', str(source), 'show', value['commit'] + ':' + name],
                                       stderr=subprocess.PIPE)
        if sha(data) != checksum:
            raise ValueError('fixed Git object fingerprint differs: ' + name)
        blobs[name] = data
    destination.mkdir(parents=True)
    for name, data in blobs.items():
        path = local(destination, name)
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open('xb') as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
    return verify(root, destination)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('action', choices=('verify', 'export'))
    parser.add_argument('--directory', required=True)
    parser.add_argument('--source', type=Path, help='local original kit Git repository; export only')
    args = parser.parse_args()
    os.setpriority(os.PRIO_PROCESS, 0, 19)
    if args.action == 'export' and args.source is None:
        parser.error('export requires --source')
    result = (export(args.root, args.source, args.directory) if args.action == 'export'
              else verify(args.root, args.directory))
    print(json.dumps(result, sort_keys=True))


if __name__ == '__main__':
    main()
