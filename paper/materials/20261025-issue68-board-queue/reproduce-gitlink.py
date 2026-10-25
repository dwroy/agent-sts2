"""Reproduce a fixed-kit metadata refusal in a tiny isolated repository."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile

sys.path.insert(0, '/home/dw/Projects/agent-board-kit/.worktrees/mas-merge-queue-20261024')
import queue_workspace

with tempfile.TemporaryDirectory(prefix='gitlink-', dir=Path(__file__).parent) as directory:
    root = Path(directory)
    subprocess.run(['git', 'init', '-q', root], check=True)
    subprocess.run(['git', '-C', root, 'update-index', '--add', '--cacheinfo',
                    '160000,002e8739dd0f2625fc7bc859ccd4828de88416cf,third_party/jev-sts2'], check=True)
    tree = subprocess.check_output(['git', '-C', root, 'write-tree'], text=True).strip()
    try:
        queue_workspace.entries(root, tree)
    except ValueError as error:
        print(json.dumps(dict(fixed_kit='1437a5cfa6e9f66e881d18e55bd82bb3c0850f93',
                             fixture='gitlink metadata only, no game contents', error=str(error))))
    else:
        raise AssertionError('fixed pin unexpectedly accepted gitlink')
