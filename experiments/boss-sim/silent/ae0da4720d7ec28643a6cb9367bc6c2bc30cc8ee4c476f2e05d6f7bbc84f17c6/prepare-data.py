"""Keep the published model and tune keys fixed; replay only new validation and controls."""
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
LIVE = Path('/home/dw/Projects/agent-sts2/.worktrees/live')

def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]

def write(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')

previous = json.loads((HERE / 'previous-trust.json').read_text())
parent = LIVE / 'experiments/boss-sim/silent' / previous['refresh']['artifact']
completed = json.loads((parent / 'completed.json').read_text())
for name in ('fights.jsonl', 'turns.jsonl', 'results.jsonl', 'boss-trust.json'):
    expected = completed['files_sha256'][name]
    assert hashlib.sha256((parent / name).read_bytes()).hexdigest() == expected, name
assert (parent / 'boss-trust.json').read_bytes() == (HERE / 'previous-trust.json').read_bytes()
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
write('reuse-audit.json', {'previous_artifact': previous['refresh']['artifact'],
    'historical_fights': len(old), 'new_validation_fights': len(added),
    'control_replays': controls, 'historical_fights_and_turns_equal': True,
    'fixed_model_base': previous['source']['simulator_base'],
    'fixed_model_sha256': previous['source']['model_sha256'],
    'verified_model_inputs': len(previous['source']['input_files']),
    'seed': 1, 'samples': 200, 'original_full_dataset_row_indices': True,
    'scope': 'Pinned published model; current production changes are not revalidated.'})
print(json.dumps({'historical': len(old), 'new': len(added),
                  'new_runs': len({r['run_id'] for r in added})}))
