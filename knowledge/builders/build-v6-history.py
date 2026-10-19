#!/usr/bin/env python3
"""Generate a frozen V6 history snapshot between games; never launch games or publish knowledge."""
import argparse
import os
from pathlib import Path
import shutil
import subprocess


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True, help='new snapshot; ops publishes between runs')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    node = shutil.which('node', path=str(Path.home()/'.local/node/bin')+os.pathsep+os.environ.get('PATH', ''))
    if node is None:
        parser.error('node is unavailable; do not install dependencies automatically')
    if os.getpriority(os.PRIO_PROCESS, 0) < 10:
        os.nice(10-os.getpriority(os.PRIO_PROCESS, 0))
    return subprocess.call([node, '--import', 'tsx', 'tools/v6/freeze-history.ts', '--manifest',
                            str(args.manifest.resolve()), '--out', str(args.out.resolve())], cwd=root/'agent')


if __name__ == '__main__':
    raise SystemExit(main())
