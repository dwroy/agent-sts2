"""Verify the published experiment and restore its exact model into this task's scratch."""
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
LIVE = Path('/home/dw/Projects/agent-sts2/.worktrees/live')

def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def write(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')

previous_path = LIVE / 'knowledge/characters/silent/boss-trust.json'
previous = json.loads(previous_path.read_text())
assert previous['character'] == 'silent'
(HERE / 'previous-trust.json').write_bytes(previous_path.read_bytes())
(HERE / 'previous-report.md').write_bytes((LIVE / 'paper/materials/silent/boss-sim-calibration.md').read_bytes())
source = previous['source']
parent = LIVE / 'experiments/boss-sim/silent' / previous['refresh']['artifact']
for name in ('completed.json', 'audit-manifest.json'):
    manifest = json.loads((parent / name).read_text())
    for filename, expected in manifest.get('files_sha256', manifest).items():
        assert sha(parent / filename) == expected, (name, filename)
assert sha(parent / 'boss-trust.json') == sha(previous_path)
snapshot = HERE / 'pinned-model'
assert not snapshot.exists()
snapshot.mkdir()
archive = subprocess.run(['git', 'archive', source['simulator_base'], 'agent/src',
                          'agent/tools/boss-sim', 'agent/package.json',
                          'knowledge/common', 'knowledge/characters/silent'],
                         cwd=ROOT, check=True, capture_output=True)
with tarfile.open(fileobj=io.BytesIO(archive.stdout)) as tar:
    for member in tar.getmembers():
        assert member.name.startswith(('agent', 'knowledge'))
        assert not member.issym() and not member.islnk()
    tar.extractall(snapshot, filter='data')
(snapshot / 'agent/node_modules').symlink_to(ROOT / 'agent/node_modules', target_is_directory=True)
for name, expected in source['input_files'].items():
    path = Path(name) if name.startswith('/') else snapshot / name
    assert sha(path) == expected, name
write('pinned-input-integrity.json', {'base': source['simulator_base'], 'model_sha256': source['model_sha256'],
                                    'verified': source['input_files']})
fights = rows(HERE / 'dataset/fights.jsonl')
old = rows(parent / 'fights.jsonl')
assert fights[:len(old)] == old
assert rows(HERE / 'dataset/turns.jsonl')[:len(old)] == rows(parent / 'turns.jsonl')
added = fights[len(old):]
assert added and all(r['key'] not in previous['split']['tune'] for r in added)
assert all(r['character'] == 'silent' for r in fights)
controls = [old[0]['key'], old[1]['key']]
write('new-fights.json', added)
write('replay-identifiers.json', controls + [r['key'] for r in added])
(HERE / 'previous-results.jsonl').write_bytes((parent / 'results.jsonl').read_bytes())
write('reuse-audit.json', {'previous_artifact': previous['refresh']['artifact'],
                         'historical_fights': len(old), 'new_validation_fights': len(added),
                         'control_replays': controls, 'historical_fights_and_turns_equal': True,
                         'fixed_model_base': source['simulator_base'], 'fixed_model_sha256': source['model_sha256'],
                         'verified_model_inputs': len(source['input_files']), 'seed': 1, 'samples': 200,
                         'original_full_dataset_row_indices': True,
                         'scope': 'Pinned published model; current production changes are not revalidated.'})
subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT, stdout=(HERE / 'base.txt').open('w'), check=True)
write('model-changes.json', {name: {'fixed': expected, 'current': sha(ROOT / name)}
                           for name, expected in source['input_files'].items()
                           if not name.startswith('/') and sha(ROOT / name) != expected})
print(json.dumps({'historical': len(old), 'new': len(added), 'verified': len(source['input_files'])}))
