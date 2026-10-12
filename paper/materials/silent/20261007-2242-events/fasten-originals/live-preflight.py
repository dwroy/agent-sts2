import json
from pathlib import Path
import subprocess
import sys

scratch = Path(__file__).parent
live = Path('/home/dw/Projects/agent-sts2/.worktrees/live')
source = (scratch / 'source-commit.txt').read_text().strip()
before = (scratch / 'live-before-merge.txt').read_text().strip()
preview = subprocess.run(['git', '-C', str(live), 'merge-tree', '--write-tree', before, source],
                         capture_output=True, text=True)
(scratch / 'merge-tree-preview.txt').write_text(preview.stdout + preview.stderr)
conflicts = [line for line in preview.stdout.splitlines() if line.startswith('CONFLICT')]
record = {'source': source, 'live_before_merge': before, 'preview_exit': preview.returncode,
          'conflicts': conflicts, 'actual_merge_attempted': False,
          'refresh_committed': (scratch / 'refresh-commit.log').exists(),
          'refresh_overwritten': False}
(scratch / 'live-preflight.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'preview_exit': preview.returncode, 'conflicts': len(conflicts),
                  'knowledge_conflicts': [line for line in conflicts if 'knowledge/' in line]}, ensure_ascii=False))
if preview.returncode:
    sys.exit(20)
