"""Restore and verify the published model without moving its validation experiment."""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tarfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
previous = json.loads((HERE / 'previous-live-trust.json').read_text())
source = previous['source']
cached = json.loads((HERE / 'cached-trust.json').read_text())
assert cached['source']['input_files'] == source['input_files']
assert cached['split']['tune'] == previous['split']['tune']
assert cached['split']['cutoff_ts'] == previous['split']['cutoff_ts']
parent = ROOT / 'experiments/boss-sim/silent' / cached['refresh']['artifact']
snapshot = HERE / 'pinned-model'

def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def write(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')

for manifest_name in ('completed.json', 'audit-manifest.json'):
    manifest = json.loads((parent / manifest_name).read_text())
    for name, expected in manifest.get('files_sha256', manifest).items():
        assert sha(parent / name) == expected, (manifest_name, name)

if not snapshot.exists():
    snapshot.mkdir()
    archive = subprocess.run(['git', 'archive', source['simulator_base'], 'agent/src',
                              'agent/tools/boss-sim', 'agent/package.json',
                              'knowledge/common', 'knowledge/characters/silent'],
                             cwd=ROOT, check=True, capture_output=True)
    with tarfile.open(fileobj=io.BytesIO(archive.stdout)) as tar:
        for member in tar.getmembers():
            assert member.name in ('agent', 'knowledge', 'knowledge/common', 'knowledge/characters', 'knowledge/characters/silent') or member.name.startswith(('agent/', 'knowledge/common/', 'knowledge/characters/silent/'))
            assert not member.issym() and not member.islnk()
        tar.extractall(snapshot, filter='data')
    (snapshot / 'agent/node_modules').symlink_to(ROOT / 'agent/node_modules', target_is_directory=True)

verified = {}
for name, expected in source['input_files'].items():
    path = Path(name) if name.startswith('/') else snapshot / name
    assert sha(path) == expected, name
    verified[name] = expected
write('pinned-input-integrity.json', {'base': source['simulator_base'],
      'model_sha256': source['model_sha256'], 'verified': verified})

fights = rows(HERE / 'dataset/fights.jsonl')
historical = rows(parent / 'fights.jsonl')
turns = rows(HERE / 'dataset/turns.jsonl')
assert fights[:len(historical)] == historical
assert turns[:len(historical)] == rows(parent / 'turns.jsonl')
added = fights[len(historical):]
assert len(added) > 0
assert all(row['key'] not in previous['split']['tune'] for row in added)
assert all(row['character'] == 'silent' for row in fights)
controls = [historical[0]['key'], historical[1]['key']]
write('new-fights.json', added)
write('replay-identifiers.json', controls + [row['key'] for row in added])
write('pinned-replay-audit.json', {
    'previous_artifact': previous['refresh']['artifact'], 'cache_artifact': cached['refresh']['artifact'],
    'fixed_model_base': source['simulator_base'], 'fixed_model_sha256': source['model_sha256'],
    'verified_model_inputs': len(verified), 'historical_fights': len(historical),
    'new_validation_fights': len(added), 'control_replays': controls,
    'historical_fights_and_turns_byte_equivalent': True,
    'seed': 1, 'samples': 200, 'original_full_dataset_row_indices': True,
    'scope': 'Previous published model pinned exactly; current production model is not revalidated by this refresh.',
})
print(json.dumps({'historical': len(historical), 'new': len(added), 'verified_inputs': len(verified), 'snapshot': str(snapshot)}))
