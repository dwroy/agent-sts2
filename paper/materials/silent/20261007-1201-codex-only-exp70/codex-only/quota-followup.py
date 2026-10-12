"""Read-only latest-window audit; initial statistics and all older audit cuts stay unchanged."""
import datetime as dt
import json
from pathlib import Path
import sys

ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = Path(__file__).parent
sys.path.insert(0, str(ROOT / '.worktrees/codex-only-brain/eval'))
import brain_source

cuts = {name: (ROOT / 'logs' / name).stat().st_size for name in ['runs.jsonl', 'brain.jsonl']}
start = dt.datetime(2026, 10, 7, tzinfo=dt.timezone(dt.timedelta(hours=8)))
ids = set()
quota = []
for row in brain_source.jsonl(ROOT / 'logs/brain.jsonl', cuts['brain.jsonl']):
    try:
        when = dt.datetime.fromisoformat(row['ts'].replace('Z', '+00:00'))
    except (KeyError, ValueError):
        continue
    if when >= start:
        ids.add(row.get('run_id'))
        if row.get('error_kind') == 'quota' or (row.get('fell_back_from') or {}).get('kind') == 'quota':
            quota.append({key: row.get(key) for key in ['ts', 'run_id', 'label', 'engine', 'question_id', 'error_kind']} |
                         {'fell_back_kind': (row.get('fell_back_from') or {}).get('kind'), 'accepted': brain_source.successful(row)})
runs = {row['run_id']: row for row in brain_source.jsonl(ROOT / 'logs/runs.jsonl', cuts['runs.jsonl']) if row.get('run_id')}
for row in runs.values():
    try:
        ended = dt.datetime.fromisoformat(row['ended'].replace('Z', '+00:00'))
    except (KeyError, ValueError, AttributeError):
        continue
    if ended >= start:
        ids.add(row['run_id'])
ids.discard(None)
sources = brain_source.load_sources(ROOT / 'logs', ids, cuts['brain.jsonl'])
records = [{'run_id': rid, 'ended': runs.get(rid, {}).get('ended'), 'victory': runs.get(rid, {}).get('victory'),
            'brain_source': sources.get(rid, brain_source.classify([]))} for rid in ids]
records.sort(key=lambda row: row['brain_source'].get('first_success') or row.get('ended') or '')
old = OUT / 'quota-followup.json'
if old.exists():
    stamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    (OUT / f'quota-followup-before-{stamp}.json').write_bytes(old.read_bytes())
data = {'cut_bytes': cuts, 'cut_time': dt.datetime.now(dt.timezone.utc).isoformat(),
        'all_oct7_runs_including_unfinished': records, 'quota_events': quota, 'initial_stats_preserved': True}
old.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
print({'oct7_runs': len(records), 'quota_events': len(quota), 'cut_bytes': cuts})
