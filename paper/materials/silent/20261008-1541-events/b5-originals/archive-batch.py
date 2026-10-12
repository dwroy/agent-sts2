"""Archive a completed, rejected Silent batch without modifying published knowledge."""
import hashlib
import json
import shutil
from pathlib import Path

S = Path(__file__).resolve().parent
ROOT = S.parents[2]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


gate = json.loads((S / 'acceptance.json').read_text())
assert gate['accepted'] is False and gate['isolation']['passed'] is True
assert gate['isolation']['base'] == gate['isolation']['head'] == '261af56e0022cc0012b80870bd3f52bd121d45c2'
checks = json.loads((S / 'test-sandbox.receipt.json').read_text())
assert isinstance(checks['rc'], int)
ledger = json.loads((S / 'ledger-receipt.json').read_text())
assert ledger['ids'] and ledger['rc'] == 0
identity = {name: sha(S / name) for name in ('evidence.original.json', 'split.json', 'before-trust.json', 'after-trust.json', 'acceptance.json')}
artifact = hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
dest = ROOT / 'experiments/boss-sim/silent' / artifact
assert not dest.exists(), 'Never overwrite an existing experiment'
dest.mkdir()
files = {}


def copy(path, relative=None):
    target = dest / (relative or path.relative_to(S))
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, target)
    files[str(target.relative_to(dest))] = {'sha256': sha(target), 'source_sha256': sha(path), 'bytes': target.stat().st_size}


for path in sorted(S.iterdir()):
    if path.is_file() and path.suffix in {'.json', '.jsonl', '.md', '.py', '.mts', '.log'} and path.name not in {'archive-receipt.json', 'report.json', 'report.md'}:
        copy(path)
for directory in ('before-authoritative-results', 'before-tail-0-results', 'before-tail-1-results', 'after-results', 'after-queen-results', 'tune-threat1-results', 'tune-threat2-results'):
    for path in sorted((S / directory).glob('*.jsonl')):
        copy(path)
copy(S / 'before-prefix.frozen.jsonl')
for name in ('sources.jsonl', 'fights.jsonl', 'turns.jsonl', 'extraction.json'):
    copy(S / 'dataset' / name)
for name in ('before.isolation.json', 'after.isolation.json'):
    copy(S / 'acceptance' / name)
provenance = json.loads((S / 'before-provenance.json').read_text())
for name, checksum in provenance['input_files'].items():
    if name.startswith('knowledge/') and name.endswith('.json'):
        path = ROOT / name
        assert sha(path) == checksum
        copy(path, Path('model-inputs') / name)
# Only Silent run metadata is needed to reproduce the role filter. Original snapshot-prefix hashes remain in extraction.json.
for path in sorted((S / 'dataset').glob('*snapshot*.jsonl')):
    kept = []
    for line in path.read_text().splitlines():
        row = json.loads(line)
        if str(row.get('character', '')).lower() == 'silent':
            kept.append(row)
    if 'runs' in path.name:
        eligible = {r['run_id'] for r in kept}
    else:
        kept = [json.loads(line) for line in path.read_text().splitlines() if json.loads(line).get('run_id') in eligible]
    target = dest / 'dataset' / path.name
    target.write_text(''.join(json.dumps(row, ensure_ascii=False)+'\n' for row in kept))
    files[str(target.relative_to(dest))] = {'sha256': sha(target), 'original_snapshot_sha256': sha(path), 'bytes': target.stat().st_size, 'filter': 'Silent run identities only'}
manifest = {'character': 'silent', 'boss': 'QUEEN', 'mode': 'b5', 'outcome': 'rejected', 'artifact': artifact,
            'identity': identity, 'source_base': gate['isolation']['base'], 'source_head': gate['isolation']['head'],
            'ledger_ids': ledger['ids'], 'files': files, 'published': False, 'original_checks_rc': checks['rc'],
            'scope': 'Frozen paired experiment and all failed drafts; no changes to live knowledge, source or eval version'}
(dest / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1)+'\n')
(S / 'archive-receipt.json').write_text(json.dumps({'artifact': artifact, 'path': str(dest), 'files': len(files), 'bytes': sum(r['bytes'] for r in files.values()), 'manifest_sha256': sha(dest/'manifest.json')}, indent=1)+'\n')
print(json.dumps({'artifact': artifact, 'files': len(files), 'path': str(dest)}))
