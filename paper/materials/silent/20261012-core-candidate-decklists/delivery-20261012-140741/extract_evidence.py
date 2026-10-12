import hashlib
import json
from pathlib import Path
import re

ROOT = Path('/home/dw/Projects/agent-sts2')
INPUT = ROOT / 'paper/materials/silent/20261012-core-candidate-decklists/inputs'
OUT = Path(__file__).resolve().parent
manifest = json.loads((INPUT.parent / 'registration-input-manifest.json').read_text())
allowed = {row['run_id'] for row in manifest['runs']}
refs = []
report = (INPUT / 'historical-report.md').read_text()
pattern = r'\| (E\d+) \| ([A-Z0-9]+) / F(\d+) / T([^|]+) \| ([\w-]+\.jsonl) @(\d+) \+(\d+) \| ([a-f0-9]{64}) \|'
for match in re.finditer(pattern, report):
    key, run, floor, turn, file, offset, size, digest = match.groups()
    if run in allowed and (int(key[1:]) <= 125 or key == 'E542'):
        refs.append(dict(id='H-' + key, run_id=run, floor=int(floor), turn=turn.strip(),
                         source=file, off=int(offset), len=int(size), sha256=digest))
for row in json.loads((INPUT / 'historical-first-formation.json').read_text()):
    if row['run_id'] in allowed:
        ref = row['first_observed'].copy()
        ref['id'] = 'formation-' + row['candidate'] + '-' + row['run_id']
        refs.append(ref)
pattern = r'\| (E\d+) ([A-Z0-9]+) F(\d+) \| ([\w-]+\.jsonl) ([^|]+) \| (\d+) \| (\d+) \| ([a-f0-9]{64}) \|'
for match in re.finditer(pattern, (INPUT / 'core-output-204-report.md').read_text()):
    key, run, floor, file, detail, offset, size, digest = match.groups()
    if run in allowed:
        refs.append(dict(id='O-' + key + '-' + str(offset), run_id=run, floor=int(floor),
                         detail=detail.strip(), source=file, off=int(offset), len=int(size), sha256=digest))
pattern = r'\| (C\d+) \| ([A-Z0-9]+)/F(\d+)/T([^|]+) \| ([\w-]+\.jsonl) \| (\d+) \| (\d+) \| ([a-f0-9]{64}) \| ([^|]+) \|'
for match in re.finditer(pattern, (INPUT / 'core-reuse-201-report.md').read_text()):
    key, run, floor, turn, file, offset, size, digest, detail = match.groups()
    if run in {'C48LLXBGKXQ9', 'LRN0HPZ0FZS1'}:
        refs.append(dict(id='U-' + key + '-' + str(offset), run_id=run, floor=int(floor),
                         turn=turn.strip(), detail=detail.strip(), source=file,
                         off=int(offset), len=int(size), sha256=digest))
records = []
for ref in refs:
    path = ROOT / 'logs' / ref['source']
    with path.open('rb') as handle:
        handle.seek(ref['off'])
        data = handle.read(ref['len'])
    assert hashlib.sha256(data).hexdigest() == ref['sha256'], ref
    row = json.loads(data)
    observed_run = row.get('run_id') or row.get('state', {}).get('run_id')
    assert observed_run == ref['run_id'], (ref, list(row))
    records.append(dict(ref=ref, row=row))
(OUT / 'evidence-records.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
(OUT / 'evidence-index.json').write_text(json.dumps(refs, ensure_ascii=False, indent=2) + '\n')
print('VERIFIED_RAW_RECORDS', len(records), 'unique', len({(r['source'], r['off']) for r in refs}))
for wanted in ['H-E014', 'H-E032', 'H-E050', 'H-E056', 'H-E062', 'O-E06-7860441192']:
    row = next(x['row'] for x in records if x['ref']['id'] == wanted)
    print('SCHEMA', wanted, list(row))
    for key, value in row.items():
        if isinstance(value, dict):
            print(key, list(value))
        elif key not in ['ts']:
            print(key, str(value)[:200])
