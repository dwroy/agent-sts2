import hashlib
import json
import re
from pathlib import Path

ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = Path(__file__).resolve().parent
dispatch = json.loads((OUT / 'dispatch.json').read_text())
runs = dispatch['runs']
pattern = re.compile(b'|'.join(run.encode() for run in runs))
manifest = {'batch': '20261014-091302-s2-strategy-proposal', 'runs': runs, 'sources': {}}
inputs = {run: {'run': None, 'decisions': [], 'states': []} for run in runs}
for name in ['runs', 'run-config', 'sl-attempts', 'decisions', 'states']:
    source = ROOT / 'logs' / (name + '.jsonl')
    limit = source.stat().st_size
    refs = []
    counts = {run: 0 for run in runs}
    with source.open('rb') as handle, (OUT / (name + '.jsonl')).open('wb') as target:
        line_no = 0
        while handle.tell() < limit:
            offset = handle.tell()
            raw = handle.readline()
            line_no += 1
            if offset + len(raw) > limit or not raw.endswith(b'\n'):
                break
            if not pattern.search(raw):
                continue
            row = json.loads(raw)
            run = row.get('run_id') if name != 'states' else row.get('state', {}).get('run_id')
            if run not in inputs:
                continue
            target.write(raw)
            refs.append({'run_id': run, 'line': line_no, 'offset': offset,
                         'length': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()})
            counts[run] += 1
            if name == 'runs':
                assert inputs[run]['run'] is None
                assert row['character'].lower() == 'silent' and row['ascension'] == 10
                inputs[run]['run'] = row
            elif name in ['states', 'decisions']:
                row['_line'] = line_no
                inputs[run][name].append(row)
    manifest['sources'][name] = {'path': str(source), 'cut_bytes': limit, 'counts': counts, 'rows': refs}
    print(name, counts, flush=True)
for run, value in inputs.items():
    assert value['run'] is not None
    assert value['states'] and value['decisions']
    assert len(value['decisions']) == value['run']['decisions'], (run, len(value['decisions']))
    (OUT / (run + '.input.json')).write_text(json.dumps(value, ensure_ascii=False) + '\n')
manifest['frozen_files'] = {p.name: {'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
                            for p in OUT.glob('*.input.json')}
(OUT / 'evidence-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
