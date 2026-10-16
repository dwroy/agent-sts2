"""Restore only the exact published model manifest, never a complete repository copy."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = Path('/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration')
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--previous', default=str(HERE/'previous-trust.json'))
p.add_argument('--target', default=str(HERE/'.pinned-model'))
args = p.parse_args()
previous = json.loads(Path(args.previous).read_text())
assert previous['character'] == 'silent'
base = previous['source']['simulator_base']
target = Path(args.target)
for name, expected in previous['source']['input_files'].items():
    if name.startswith('/'):
        raw = Path(name).read_bytes()
    else:
        assert '..' not in Path(name).parts and '.env' not in Path(name).name
        raw = subprocess.check_output(['git', 'show', base+':'+name], cwd=ROOT)
    assert hashlib.sha256(raw).hexdigest() == expected, name
    if not name.startswith('/'):
        path = target/name
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists():
            assert path.read_bytes() == raw, 'do not overwrite different model input: '+name
        else:
            path.write_bytes(raw)
for name in ('agent/package.json', 'agent/tsconfig.json'):
    raw = subprocess.check_output(['git', 'show', base+':'+name], cwd=ROOT)
    path = target/name
    if path.exists():
        assert path.read_bytes() == raw, name
    else:
        path.write_bytes(raw)
link = target/'agent/node_modules'
if not link.exists():
    link.symlink_to(ROOT/'agent/node_modules', target_is_directory=True)
print(json.dumps({'base': base, 'verified': len(previous['source']['input_files']), 'target': str(target)}))
