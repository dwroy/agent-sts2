#!/usr/bin/env python3
"""Read existing game/controller identities and legacy full-test processes."""
import argparse
import json
import os
import re
from pathlib import Path

from process_scope import belongs


def observe(root, live=None, proc=Path('/proc')):
    root = Path(root).resolve()
    live = Path(live).resolve() if live else root / '.worktrees/live'
    games, legacy = [], []
    for entry in proc.iterdir():
        if not entry.name.isdigit():
            continue
        try:
            fields = (entry / 'stat').read_text().rsplit(')', 1)[1].split()
            if fields[0] in ('Z', 'X'):
                continue
            row = dict(pid=int(entry.name), start=fields[19])
            if belongs(int(entry.name), root, live, proc=proc, kind='play'):
                games.append(row)
            argv = [a.decode(errors='replace') for a in (entry / 'cmdline').read_bytes().split(b'\0') if a]
            # Count the master only, not Vitest workers or a queued wrapper's command arguments.
            master = (argv and (argv[0] == 'node (vitest)' or
                Path(argv[0]).name == 'node' and len(argv) > 1 and
                (argv[1].endswith('/vitest.mjs') or argv[1].endswith('/.bin/vitest'))))
            if master and (entry / 'cwd').resolve(strict=True).is_relative_to(root):
                scope = (entry / 'cwd').resolve(strict=True).parent.name
                issue = re.search(r'issue-?([1-9][0-9]*)', scope)
                row.update(task=f'#{issue[1]}' if issue else f'PID{entry.name}',
                    role='integrator' if scope.startswith('integrator-') else 'ops' if scope.startswith('ops-') else 'dev')
                legacy.append(row)
        except FileNotFoundError:
            continue
        except PermissionError:
            # Unreadable system processes are outside this user's managed checkout.
            if entry.stat().st_uid == os.getuid():
                raise
    return dict(running=bool(games), pids=games, legacy=legacy)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True)
    parser.add_argument('--live')
    args = parser.parse_args()
    print(json.dumps(observe(args.root, args.live)))


if __name__ == '__main__':
    main()
