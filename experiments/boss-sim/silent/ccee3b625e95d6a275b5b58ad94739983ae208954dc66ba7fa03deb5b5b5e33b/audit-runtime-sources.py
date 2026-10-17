"""Read only selected source metadata from finished Silent runs; never rewrite run.code."""
import collections
import hashlib
import json
from pathlib import Path

S = Path(__file__).resolve().parent
extraction = json.loads((S / 'dataset/extraction.json').read_text())
eligible = set(extraction['eligible_run_ids'])
delta = json.loads((S / 'dataset-delta.json').read_text())
new_runs = {r['run'] for r in delta['new_rows']}
path = Path('/home/dw/Projects/agent-sts2/logs/run-config.jsonl')
cut = path.stat().st_size
offset = 0
prefix = hashlib.sha256()
rows = []
with path.open('rb') as handle:
    while offset < cut:
        raw = handle.readline()
        if not raw or offset + len(raw) > cut or not raw.endswith(b'\n'):
            break
        row = json.loads(raw)
        prefix.update(raw)
        if row.get('run_id') in eligible:
            code = row.get('code') or {}
            if not isinstance(code, dict):
                code = {'code': code}
            process = row.get('process') or {}
            rows.append({'run_id': row['run_id'], 'character': row.get('character'),
                         'ts': row.get('ts'), 'floor': row.get('floor'), 'restart': row.get('restart'),
                         'process_started': process.get('started'), 'commit': code.get('commit'),
                         'code': code.get('code'), 'dirty': code.get('dirty'),
                         'dirty_files_count': len(code.get('dirty_files') or []),
                         'config_sha': row.get('config_sha'), 'row_off': offset, 'row_len': len(raw),
                         'row_sha256': hashlib.sha256(raw).hexdigest()})
        offset += len(raw)
by_run = collections.defaultdict(list)
for row in rows:
    by_run[row['run_id']].append(row)
summary = []
for run in sorted(eligible):
    mine = by_run[run]
    summary.append({'run_id': run, 'new_run': run in new_runs, 'config_rows': len(mine),
                    'startup_heads': sorted({r['commit'] for r in mine if r['commit']}),
                    'dirty_rows': sum(r['dirty'] is True for r in mine),
                    'unknown_dirty_rows': sum(r['dirty'] is None for r in mine),
                    'character_mismatch_rows': sum(str(r['character']).lower() not in ('silent', 'none') for r in mine),
                    'limitations': 'Startup HEAD and dirty flags only; not a reconstruction of dirty files, worker reloads, or one exact code tree for the entire fight.'})
out = {'source': str(path), 'prefix_bytes': offset, 'prefix_sha256': prefix.hexdigest(),
       'eligible_finished_silent_runs': len(eligible), 'matched_config_rows': len(rows),
       'runs_without_config': [r['run_id'] for r in summary if not r['config_rows']],
       'new_runs': len(new_runs), 'new_runs_with_config': sum(bool(by_run[r]) for r in new_runs),
       'rows': rows, 'summary': summary}
(S / 'runtime-source-audit.json').write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: v for k, v in out.items() if k not in ('rows', 'summary')}, ensure_ascii=False))
