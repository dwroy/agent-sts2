"""Bind each frozen boss opening to preceding sanitized run-config metadata."""
import collections
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
sources = [json.loads(line) for line in (HERE / 'dataset/sources.jsonl').read_text().splitlines()]
ids = {row['run_id'] for row in sources}
configs = collections.defaultdict(list)
path = Path('/home/dw/Projects/agent-sts2/logs/run-config.jsonl')
with path.open('rb') as handle:
    while True:
        offset = handle.tell()
        raw = handle.readline()
        if not raw:
            break
        record = json.loads(raw)
        if record.get('run_id') not in ids:
            continue
        assert record['character'] == 'SILENT'
        configs[record['run_id']].append({'ts': record['ts'], 'run_id': record['run_id'],
              'offset': offset, 'length': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
              'code': record.get('code'),
              'brain': {k: record.get('brain', {}).get(k) for k in ('engine', 'model', 'reasoning_effort')}})
bound = []
for row in sources:
    prior = [c for c in configs[row['run_id']] if c['ts'].replace('Z', '') <= row.get('first_ts', '')]
    config = max(prior, key=lambda c: c['ts']) if prior else None
    bound.append({'key': row.get('key'), 'run_id': row['run_id'], 'floor': row['floor'],
                  'attempt': row['attempt'], 'first_ts': row.get('first_ts'), 'reported_run_code': row.get('code'),
                  'config': config, 'scope': 'Observed startup/resume code; full dirty tree and mid-fight changes are not reconstructed.'})
(HERE / 'fight-code-provenance.json').write_text(json.dumps(bound, ensure_ascii=False, indent=1) + '\n')
summary = {'attempts': len(bound), 'with_prior_config': sum(r['config'] is not None for r in bound),
           'reported_versions': dict(collections.Counter(str(r['reported_run_code']) for r in bound)),
           'missing': [r['key'] for r in bound if r['config'] is None]}
(HERE / 'version-audit-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=1) + '\n')
print(json.dumps({k: v for k, v in summary.items() if k != 'reported_versions'}))
