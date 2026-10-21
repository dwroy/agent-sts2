#!/usr/bin/env python3
"""Run the separately installed host-local agent-board-kit from the existing ops tick."""
import argparse
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from issue_session_support import Board, safe_path, stamp


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', default=Path(__file__).resolve().parents[1])
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    board = None
    try:
        root = Path(args.root).resolve()
        board = Board(root)
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
        if board and not args.dry_run:
            with board.inbox.open('a') as handle:
                handle.write(f'- {stamp()} [board] 启动失败：检查 kit 安装及本机项目登记；原现场保留。\n')
        print('{"state":"retained","reason":"check kit installation and host project registry"}')
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
