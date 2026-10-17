"""Restore only the published model's explicit input manifest, never a repository archive."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = Path('/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration')
LIVE = Path('/home/dw/Projects/agent-sts2/.worktrees/live')
OLD = Path('/home/dw/Projects/agent-sts2/learner/runs/20261016-050122-21c48aea-19f1-459a-b67e-e18af997b998-silent-boss-calibration/.pinned-model')
previous_bytes = (LIVE / 'knowledge/characters/silent/boss-trust.json').read_bytes()
(HERE / 'previous-trust.json').write_bytes(previous_bytes)
(HERE / 'previous-report.md').write_bytes((LIVE / 'paper/materials/silent/boss-sim-calibration.md').read_bytes())
previous = json.loads(previous_bytes)
model = HERE / '.pinned-model'
verified = []
for name, expected in previous['source']['input_files'].items():
    source = Path(name) if name.startswith('/') else OLD / name
    raw = source.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == expected, name
    if not name.startswith('/'):
        target = model / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(raw)
    verified.append({'path': name, 'sha256': expected})
for name in ('package.json', 'tsconfig.json'):
    if (OLD / 'agent' / name).exists():
        shutil.copyfile(OLD / 'agent' / name, model / 'agent' / name)
dependencies = model / 'agent/node_modules'
if not dependencies.exists():
    dependencies.symlink_to(ROOT / 'agent/node_modules', target_is_directory=True)
(HERE / 'pinned-input-integrity.json').write_text(json.dumps(verified, indent=1) + '\n')
(HERE / 'base.txt').write_text(subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True))
(HERE / 'source-code-diff.patch').write_bytes(subprocess.check_output(['git', 'diff', '--binary'], cwd=ROOT))
print(json.dumps({'model_files_verified': len(verified), 'base': previous['source']['simulator_base'], 'artifact': previous['refresh']['artifact']}))
