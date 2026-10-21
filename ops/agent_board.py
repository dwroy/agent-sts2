#!/usr/bin/env python3
"""Run the separately installed host-local agent-board-kit from the existing ops tick."""
import argparse
import json
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from issue_session_support import Board, atomic, locks, safe_path, stamp


def control_path(board):
    return safe_path(board.root, board.data['dispatcher']['control'])


def persisted_mode(board):
    path = control_path(board)
    if not path.exists():
        return 'off'
    data = json.loads(path.read_text())
    if (not isinstance(data, dict) or data.get('schema') != 'agent-board-control-v1'
            or data.get('root') != str(board.root) or data.get('repo') != board.repo
            or data.get('mode') not in ('on', 'off')):
        raise ValueError('invalid or rebound board control; no actions taken')
    return data['mode']


def effective_mode(board):
    if 'CODEX_AGENT_BOARD' in os.environ:
        mode = os.environ['CODEX_AGENT_BOARD']
        if mode not in ('on', 'off'):
            raise ValueError('CODEX_AGENT_BOARD must be on or off')
        return mode
    return persisted_mode(board)


def set_mode(board, mode):
    path = control_path(board)
    with locks([safe_path(board.root, path.with_suffix('.lock'))]):
        persisted_mode(board)  # Never overwrite a damaged or foreign control record.
        if mode == 'on':
            settings = board.data['dispatcher']
            script = safe_path(board.root, settings['install']) / 'board.py'
            if script.is_symlink() or not script.is_file():
                raise ValueError('kit installation required before enabling')
            registry = json.loads(safe_path(board.root, settings['registry']).read_text())
            projects = registry.get('projects') if isinstance(registry, dict) else None
            if not isinstance(projects, list) or not projects:
                raise ValueError('host registry required before enabling')
            roots = [p.get('root') if isinstance(p, dict) else None for p in projects]
            if (not all(isinstance(root, str) and Path(root).is_absolute() and '..' not in Path(root).parts
                        and root == str(Path(root)) for root in roots)
                    or len(set(roots)) != len(roots) or roots.count(str(board.root)) != 1):
                raise ValueError('unique approved host roots including this project required')
        atomic(path, dict(schema='agent-board-control-v1', root=str(board.root), repo=board.repo,
                          mode=mode, updated_at=stamp()))
    return dict(persisted=mode, effective=effective_mode(board),
                source='environment' if 'CODEX_AGENT_BOARD' in os.environ else 'project-control')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', default=Path(__file__).resolve().parents[1])
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--dry-run', action='store_true')
    mode.add_argument('--set-enabled', choices=('on', 'off'), help='persist project control only; never dispatch')
    mode.add_argument('--show-enabled', action='store_true', help='read effective on/off; never write or dispatch')
    args = parser.parse_args()
    board = None
    try:
        root = Path(args.root).resolve()
        board = Board(root)
        if args.show_enabled:
            print(effective_mode(board))
            return 0
        if args.set_enabled:
            # Reject invalid explicit overrides before writing the persisted control.
            if 'CODEX_AGENT_BOARD' in os.environ:
                effective_mode(board)
            print(json.dumps(set_mode(board, args.set_enabled)))
            return 0
        settings = board.data['dispatcher']
        script = safe_path(root, settings['install']) / 'board.py'
        if script.is_symlink() or not script.is_file():
            raise ValueError('agent-board-kit installation missing or unsafe')
        registry = safe_path(root, settings['registry'])
        if not registry.is_file():
            raise ValueError('host project registry missing; register projects before enabling')
        argv = [sys.executable, str(script), '--registry', str(registry)]
        if args.dry_run:
            argv.append('--dry-run')
        if os.environ.get('CODEX_OPS_RETENTION') == 'off':
            argv.append('--no-reclaim')
        # Replace this process; the launcher does not add another long-lived worker.
        os.execv(sys.executable, argv)
    except (OSError, ValueError, KeyError, TypeError):
        if args.show_enabled or args.set_enabled:
            print('{"state":"retained","reason":"invalid control, environment or host registry; no dispatch"}')
            return 1
        if board and not args.dry_run:
            with board.inbox.open('a') as handle:
                handle.write(f'- {stamp()} [board] 启动失败：检查 kit 安装及本机项目登记；原现场保留。\n')
        print('{"state":"retained","reason":"check kit installation and host project registry"}')
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
