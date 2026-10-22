#!/usr/bin/env python3
"""Project entry to the shared machine claim protocol; retain the caller's cwd/argv."""
import argparse
from contextlib import contextmanager
import os
from pathlib import Path
import subprocess
import sys

from issue_session_support import Board, safe_path


def queued_argv(root, role, argv):
    root = Path(root).resolve()
    if not (root / '.agents/board.yaml').exists():
        return argv
    board = Board(root)
    if not board.data['dispatcher'].get('heavy', {}).get('enabled', False):
        return argv
    return [sys.executable, str(root / 'ops/board_heavy.py'), '--root', str(root), role, '--', *argv]


@contextmanager
def admission(root, role, task='post-merge-checks'):
    """Acquire resource admission before existing publication locks; off preserves old flow."""
    root = Path(root).resolve()
    if not (root / '.agents/board.yaml').exists():
        yield
        return
    board = Board(root)
    config = board.data['dispatcher'].get('heavy', {})
    if not config.get('enabled', False):
        yield
        return
    install = safe_path(root, board.data['dispatcher']['install'])
    sys.path.insert(0, str(install))
    try:
        from board import Board as KitBoard
        import heavy
        with heavy.admission(KitBoard(root), role, [task], cwd=root):
            yield
    finally:
        sys.path.remove(str(install))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root')
    parser.add_argument('--issue', type=int)
    parser.add_argument('role', choices=['ops', 'integrator', 'learner', 'experiment', 'dev', 'other', 'game'])
    parser.add_argument('command', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    try:
        root = Path(args.root).resolve() if args.root else Path(subprocess.check_output(
            ['git', '-C', str(Path(__file__).resolve().parent), 'rev-parse', '--path-format=absolute', '--git-common-dir'],
            text=True).strip()).parent
        board = Board(root)
        command = args.command[1:] if args.command[:1] == ['--'] else args.command
        if args.role == 'game' and not board.data['dispatcher'].get('heavy', {}).get('enabled', False):
            if not command:raise ValueError('game command required')
            os.execvpe(command[0], command, os.environ)
            return 0
        script = safe_path(root, board.data['dispatcher']['install']) / 'heavy.py'
        if not script.is_file() or script.is_symlink():
            raise ValueError('heavy queue kit is not installed')
        argv = [sys.executable, str(script), *(['game'] if args.role == 'game' else []), '--root', str(root)]
        if args.issue:
            argv += ['--issue', str(args.issue)]
        argv += (['--', *command] if args.role == 'game' else [args.role, '--', *command])
        os.execv(sys.executable, argv)
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError):
        print('heavy queue unavailable; command not run, preserve original task', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
