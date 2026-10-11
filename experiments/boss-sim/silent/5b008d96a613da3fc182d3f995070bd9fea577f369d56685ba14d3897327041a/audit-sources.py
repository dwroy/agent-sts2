"""Verify only finished Silent evidence and preserve exact source offsets."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
LOGS = Path('/home/dw/Projects/agent-sts2/logs')
sys.path.insert(0, str(ROOT / 'agent/tools/boss-sim'))
from cadence import cadence

def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]

def write(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')

previous = json.loads((HERE / 'previous-live-trust.json').read_text())
runs = rows(HERE / 'dataset/runs-snapshot.jsonl')
sl = rows(HERE / 'dataset/sl-snapshot.jsonl')
c = cadence(runs, sl, previous['refresh'])
new_events = sorted(set(c['keys']) - set(previous['refresh']['keys']))
write('cadence-before.json', {**c, 'new_keys': new_events})
assert c['due'] and len(new_events) == 24 and c['max_asc'] == 10
finished = {r['run_id']: r for r in runs if r.get('character') == 'SILENT' and r.get('ended')}
fights = rows(HERE / 'dataset/fights.jsonl')
sources = rows(HERE / 'dataset/sources.jsonl')
checked = []
missing = []
with (LOGS / 'states.jsonl').open('rb') as handle:
    for row in sources:
        assert row['run_id'] in finished
        source = row.get('source', {})
        if 't1_off' not in source:
            missing.append({'key': row.get('key'), 'excluded': row.get('excluded')})
            continue
        handle.seek(source['t1_off'])
        raw = handle.read(source['t1_len'])
        assert hashlib.sha256(raw).hexdigest() == source['t1_sha256']
        state = json.loads(raw)['state']
        assert state['run']['character_id'] == 'SILENT'
        assert state['run']['ascension'] == row['asc']
        checked.append(row['key'])
write('opening-source-integrity.json', {'verified_openings': len(checked), 'missing_openings': missing,
      'source_count': len(sources), 'sha256_offsets_lengths_and_strict_character': True})
old_keys = set(previous['split']['tune'] + previous['split']['val'])
added = [row for row in fights if row['key'] not in old_keys]
assert len(added) == 24
write('new-since-live.json', added)
ids = {row['run_id'] for row in added}
records = []
with (LOGS / 'run-config.jsonl').open('rb') as handle:
    while True:
        offset = handle.tell()
        raw = handle.readline()
        if not raw:
            break
        record = json.loads(raw)
        if record.get('run_id') not in ids:
            continue
        records.append({'run_id': record['run_id'], 'ts': record.get('ts'),
                        'character': record.get('character'), 'code': record.get('code'),
                        'offset': offset, 'length': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()})
write('new-run-code-provenance.json', {'records': records, 'missing': sorted(ids - {r['run_id'] for r in records})})
assert ids == {r['run_id'] for r in records}
assert all(r['character'] == 'SILENT' for r in records)
changed = []
for name, expected in previous['source']['input_files'].items():
    path = Path(name) if name.startswith('/') else ROOT / name
    actual = hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else None
    if actual != expected:
        changed.append({'path': name, 'fixed_sha256': expected, 'current_sha256': actual})
write('model-changes.json', {'scope': 'Only the fixed published model is validated by this refresh.', 'changed': changed})
print(json.dumps({'usable': len(fights), 'new_since_live': len(added), 'sources_verified': len(checked),
                  'missing_openings': len(missing), 'code_records': len(records), 'changed_model_inputs': len(changed)}))
