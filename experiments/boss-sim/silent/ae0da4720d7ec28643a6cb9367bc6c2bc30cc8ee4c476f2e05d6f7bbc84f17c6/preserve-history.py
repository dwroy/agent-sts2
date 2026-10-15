"""Temporarily rename an exact untracked historical copy; retain and restore every byte."""
import hashlib
import json
import os
from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
ROOT = Path('/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration')
previous = Path('/home/dw/Projects/agent-sts2/learner/runs/20261015-154311-0f5e0b96-178e-4abf-a6d9-66c9d743a891-silent-boss-calibration/historical-copy-preservation.json')
manifest = json.loads(previous.read_text())
original = ROOT/'learner/runs/20261012-134305-silent-boss-calibration/live-recheck-tree'
hidden = original.with_name('.live-recheck-tree-calibration-20261016-050122')
assert Path(manifest['original']) == original
assert original.parent == hidden.parent and original.is_relative_to(ROOT)

def verify(root):
    actual = set()
    for at, directories, files in os.walk(root,followlinks=False):
        for name in directories+files:
            path = Path(at)/name
            if path.is_symlink() or path.is_file():
                actual.add(str(path.relative_to(root)))
    assert actual == {e['path'] for e in manifest['entries']},'historical inventory changed'
    for entry in manifest['entries']:
        name = Path(entry['path'])
        assert '.git' not in name.parts and '.env' not in name.name and not name.name.endswith('_api_key')
        path = root/name
        if 'link' in entry:
            assert path.is_symlink() and os.readlink(path) == entry['link']
        else:
            assert path.stat().st_size == entry['bytes']
            assert hashlib.sha256(path.read_bytes()).hexdigest() == entry['sha256'],entry['path']

if len(sys.argv)>1 and sys.argv[1]=='restore':
    assert not original.exists() and hidden.is_dir()
    verify(hidden)
    hidden.rename(original)
    verify(original)
    receipt = {'original':str(original),'verified_entries':len(manifest['entries']),
               'bytes':sum(e.get('bytes',0) for e in manifest['entries']),'restored':True,
               'scope':'Original paths, file bytes, and symlink targets restored; no historical deletion.'}
    (HERE/'historical-copy-restored.json').write_text(json.dumps(receipt,indent=1)+'\n')
    print(json.dumps(receipt))
else:
    assert original.is_dir() and not hidden.exists()
    verify(original)
    manifest.update(original=str(original),preserved=str(hidden))
    (HERE/'historical-copy-preservation.json').write_text(json.dumps(manifest,indent=1)+'\n')
    original.rename(hidden)
    verify(hidden)
    print(json.dumps({'preserved_entries':len(manifest['entries']),'original':str(original),'preserved':str(hidden)}))
