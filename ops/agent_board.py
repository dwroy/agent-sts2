#!/usr/bin/env python3
"""Run the separately installed host-local agent-board-kit from the existing ops tick."""
import argparse
import ast
import json
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from issue_session_support import Board, atomic, locks, safe_path, stamp


def control_path(board):
    return safe_path(board.root, board.data['dispatcher']['control'])


def persisted_control(board):
    path = control_path(board)
    if not path.exists():
        return dict(mode='off', poll_source='stall')
    data = json.loads(path.read_text())
    if (not isinstance(data, dict) or data.get('schema') != 'agent-board-control-v1'
            or data.get('root') != str(board.root) or data.get('repo') != board.repo
            or data.get('mode') not in ('on', 'off') or data.get('poll_source', 'stall') not in ('stall', 'minute')):
        raise ValueError('invalid or rebound board control; no actions taken')
    return data


def persisted_mode(board):
    return persisted_control(board)['mode']


def effective_mode(board):
    if 'CODEX_AGENT_BOARD' in os.environ:
        mode = os.environ['CODEX_AGENT_BOARD']
        if mode not in ('on', 'off'):
            raise ValueError('CODEX_AGENT_BOARD must be on or off')
        return mode
    return persisted_mode(board)


def set_mode(board, mode, poll_source=None):
    path = control_path(board)
    with locks([safe_path(board.root, path.with_suffix('.lock'))]):
        current = persisted_control(board)  # Never overwrite a damaged or foreign control record.
        mode = current['mode'] if mode is None else mode
        source = current.get('poll_source', 'stall') if poll_source is None else poll_source
        if source == 'minute' and os.environ.get('CODEX_AGENT_BOARD', mode) == 'on':
            settings = board.data['dispatcher']
            helpers = [safe_path(board.root, Path(settings['install']) / name) for name in ('polling.py','conversation.py')]
            if settings.get('poll_source') != 'minute' or not all(path.is_file() for path in helpers):
                raise ValueError('minute polling kit/configuration required before switching')
            script = safe_path(board.root, Path(settings['install']) / 'board.py')
            declarations = [node.value for node in ast.parse(script.read_text()).body if isinstance(node, ast.Assign)
                            and any(isinstance(target, ast.Name) and target.id == 'CAPABILITIES' for target in node.targets)]
            capabilities = ast.literal_eval(declarations[0]) if len(declarations) == 1 else set()
            if not {'minute-poll-v1','protected-handoff-v1'} <= set(capabilities):
                raise ValueError('reviewed minute/protected-handoff kit required')
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
                          mode=mode, poll_source=source, updated_at=stamp()))
    return dict(persisted=mode, effective=effective_mode(board),
                source='environment' if 'CODEX_AGENT_BOARD' in os.environ else 'project-control', poll_source=source)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', default=Path(__file__).resolve().parents[1])
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--dry-run', action='store_true')
    mode.add_argument('--set-enabled', choices=('on', 'off'), help='persist project control only; never dispatch')
    mode.add_argument('--show-enabled', action='store_true', help='read effective on/off; never write or dispatch')
    mode.add_argument('--set-poll-source', choices=('stall', 'minute'), help='ops activation only; never dispatch')
    mode.add_argument('--show-poll-source', action='store_true', help='read active entry; never dispatch')
    entry = parser.add_mutually_exclusive_group()
    entry.add_argument('--poll', action='store_true', help='single lightweight minute entry for cron')
    entry.add_argument('--stall', action='store_true', help='legacy stall entry; delegates after minute activation')
    args = parser.parse_args()
    board = None
    try:
        root = Path(args.root).resolve()
        board = Board(root)
        if args.show_poll_source:
            print(persisted_control(board).get('poll_source', 'stall')); return 0
        if args.show_enabled:
            print(effective_mode(board))
            return 0
        if args.set_enabled or args.set_poll_source:
            # Reject invalid explicit overrides before writing the persisted control.
            if 'CODEX_AGENT_BOARD' in os.environ:
                effective_mode(board)
            print(json.dumps(set_mode(board, args.set_enabled, args.set_poll_source)))
            return 0
        if args.poll or args.stall:
            expected = 'minute' if args.poll else 'stall'
            if not args.dry_run and effective_mode(board) != 'on':
                print('{"state":"disabled"}'); return 0
            if not args.dry_run and persisted_control(board).get('poll_source', 'stall') != expected:
                print('{"state":"delegated"}'); return 0
            if any(safe_path(root, path).exists() for path in board.data['dispatcher'].get('pause_files', [])):
                print('{"state":"paused"}'); return 0
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
        if args.poll:
            argv.append('--poll')
        if os.environ.get('CODEX_OPS_RETENTION') == 'off':
            argv.append('--no-reclaim')
        # Replace this process; the launcher does not add another long-lived worker.
        os.execv(sys.executable, argv)
    except (OSError, ValueError, KeyError, TypeError, SyntaxError):
        if args.show_enabled or args.set_enabled or args.show_poll_source or args.set_poll_source:
            print('{"state":"retained","reason":"invalid control, environment or host registry; no dispatch"}')
            return 1
        if board and not args.dry_run:
            with board.inbox.open('a') as handle:
                handle.write(f'- {stamp()} [board] 启动失败：检查 kit 安装及本机项目登记；原现场保留。\n')
        print('{"state":"retained","reason":"check kit installation and host project registry"}')
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
