import hashlib
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = Path(__file__).resolve().parent
dispatch = json.loads((OUT / 'dispatch.json').read_text())
runs = dispatch['runs']
assert len(runs) == len(set(runs)) == 6
needles = [run.encode() for run in runs]
selected = {name: {run: [] for run in runs} for name in (
    'runs.jsonl', 'states.jsonl', 'decisions.jsonl', 'sl-attempts.jsonl', 'run-config.jsonl')}
manifest = {'character': 'silent', 'runs': runs, 'sources': {}, 'proposals': []}
provenance = []
rejected = []
for name, by_run in selected.items():
    source = ROOT / 'logs' / name
    limit = source.stat().st_size
    raw_path = OUT / ('frozen-' + name)
    with source.open('rb') as handle, raw_path.open('wb') as target:
        line_no = 0
        while handle.tell() < limit:
            offset = handle.tell()
            raw = handle.readline()
            line_no += 1
            if not any(needle in raw for needle in needles):
                continue
            try:
                row = json.loads(raw)
            except json.JSONDecodeError as error:
                fragment = OUT / f'{name}-invalid-{line_no}.txt'
                fragment.write_bytes(raw)
                rejected.append({'file': str(source), 'line': line_no, 'offset': offset,
                    'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
                    'referenced_runs': [run for run in runs if run.encode() in raw],
                    'literal_run_ids': [x.decode() for x in re.findall(rb'"run_id"\s*:\s*"([A-Z0-9]{12})"', raw)],
                    'error': str(error), 'preserved': str(fragment)})
                continue
            state = row.get('state', {}) if name == 'states.jsonl' else {}
            run = state.get('run_id') if name == 'states.jsonl' else row.get('run_id')
            if run not in by_run:
                continue
            if name in ('runs.jsonl', 'run-config.jsonl'):
                assert row['character'].lower() == 'silent' and row['ascension'] == 10
            if name == 'states.jsonl':
                assert state['run']['character_id'].lower() == 'silent'
                assert state['run']['ascension'] == 10
            target.write(raw)
            by_run[run].append({**row, '_line': line_no})
            provenance.append({'file': str(source), 'line': line_no, 'offset': offset,
                               'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(), 'run_id': run})
    manifest['sources'][name] = {'snapshot_bytes': limit, 'extracted': str(raw_path),
                                'sha256': hashlib.sha256(raw_path.read_bytes()).hexdigest(),
                                'counts': {run: len(rows) for run, rows in by_run.items()}}
    print(name, json.dumps(manifest['sources'][name]['counts']))
for run in runs:
    assert len(selected['runs.jsonl'][run]) == 1
    row = selected['runs.jsonl'][run][0]
    inp = {'run': row, 'states': selected['states.jsonl'][run], 'decisions': selected['decisions.jsonl'][run]}
    path = OUT / (run + '-input.json')
    path.write_text(json.dumps(inp, ensure_ascii=False) + '\n')
    invalid = [{'_line': x['_line'], 'label': x.get('label'), 'decision_id': x.get('decision_id')}
               for x in inp['decisions'] if not x.get('decision_id')]
    manifest.setdefault('run_inputs', {})[run] = {'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        'missing_decision_ids': invalid, 'logged_code': row['code'], 'declared_decisions': row['decisions'],
        'decision_labels': dict(Counter(x.get('label') for x in inp['decisions']))}
    print(run, 'code', row['code'], 'missing IDs', invalid)
for p in json.loads((OUT / 'assigned-proposals.json').read_text()):
    source = Path(p['proposal'])
    raw = source.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    assert digest == p['proposal_sha256'] and p['character'] == 'silent'
    target = OUT / (p['id'] + '-original.md')
    target.write_bytes(raw)
    manifest['proposals'].append({'id': p['id'], 'source': str(source), 'copy': str(target), 'sha256': digest,
                                  'ledger': p['ledger'], 'runs': p['runs'], 'domains': p['domains']})
(OUT / 'source-lines.json').write_text(json.dumps(provenance, ensure_ascii=False) + '\n')
(OUT / 'rejected-lines.json').write_text(json.dumps(rejected, ensure_ascii=False, indent=2) + '\n')
manifest['rejected_lines'] = rejected
(OUT / 'evidence-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print('source lines', len(provenance))
