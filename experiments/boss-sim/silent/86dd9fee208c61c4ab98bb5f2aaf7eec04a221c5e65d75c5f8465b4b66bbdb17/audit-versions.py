"""Resolve each opening to the last preceding run-config, retaining ambiguous legacy labels."""
import datetime as dt
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
rows = [json.loads(line) for line in (HERE / 'dataset/sources.jsonl').read_text().splitlines()]
ids = {r['run_id'] for r in rows}
configs = {}
def stamp(value):
    return dt.datetime.fromisoformat(value.replace('Z', '+00:00')).replace(tzinfo=None)
with Path('/home/dw/Projects/agent-sts2/logs/run-config.jsonl').open('rb') as handle:
    while True:
        off = handle.tell()
        raw = handle.readline()
        if not raw:
            break
        row = json.loads(raw)
        if row.get('run_id') not in ids or row.get('character') != 'SILENT':
            continue
        configs.setdefault(row['run_id'], []).append({'ts': row['ts'], 'code': row.get('code'),
                'offset': off, 'length': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()})
resolved = []
for r in rows:
    preceding = [c for c in configs.get(r['run_id'], []) if r.get('first_ts') and stamp(c['ts']) <= stamp(r['first_ts'])]
    config = max(preceding, key=lambda c: stamp(c['ts'])) if preceding else None
    resolved.append({k: r.get(k) for k in ('key', 'run_id', 'encounter', 'asc', 'floor', 'attempt', 'turns', 'first_ts', 'code', 'excluded')} | {
        'preceding_run_config': config,
        'limitation': 'Run-config is a startup/resume observation, not a per-turn code snapshot; dirty changes and mid-run releases are not fully reconstructed.'})
(HERE / 'fight-code-provenance.json').write_text(json.dumps(resolved, ensure_ascii=False, indent=1) + '\n')
summary = {'attempts': len(resolved), 'with_preceding_run_config': sum(r['preceding_run_config'] is not None for r in resolved),
           'missing_preceding_run_config': [r['key'] for r in resolved if r['preceding_run_config'] is None]}
(HERE / 'version-audit-summary.json').write_text(json.dumps(summary, indent=1) + '\n')
print(json.dumps({k:len(v) if isinstance(v,list) else v for k,v in summary.items()}))
