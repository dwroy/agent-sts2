"""Restore the exact untracked historical copy after candidate checks, never delete it."""
import hashlib
import json
import os
from pathlib import Path

HERE = Path(__file__).resolve().parent
assert (HERE / 'source-sandbox.exit').read_text().strip() == '0'
data = json.loads((HERE / 'historical-copy-preservation.json').read_text())
original, hidden = Path(data['original']), Path(data['preserved'])
assert original.parent == hidden.parent and not original.exists()

def verify(root):
    expected = {e['path'] for e in data['entries']}
    actual = set()
    for at, directories, files in os.walk(root, followlinks=False):
        for name in directories + files:
            path = Path(at) / name
            if path.is_symlink() or path.is_file():
                actual.add(str(path.relative_to(root)))
    assert actual == expected, 'historical inventory changed; retain both paths'
    for entry in data['entries']:
        path = root / entry['path']
        if 'link' in entry:
            assert path.is_symlink() and os.readlink(path) == entry['link']
        else:
            assert path.stat().st_size == entry['bytes']
            assert hashlib.sha256(path.read_bytes()).hexdigest() == entry['sha256']

verify(hidden)
hidden.rename(original)
verify(original)
receipt = {'original': str(original), 'verified_entries': len(data['entries']),
           'bytes': sum(e.get('bytes', 0) for e in data['entries']),
           'manifest_sha256': hashlib.sha256((HERE / 'historical-copy-preservation.json').read_bytes()).hexdigest(),
           'restored': True, 'scope': 'Same paths, regular-file bytes and symlink targets; no historical deletion.'}
(HERE / 'historical-copy-restored.json').write_text(json.dumps(receipt, indent=1) + '\n')
print(json.dumps(receipt))
