"""Read deployed source and existing logs; publish only bounded evidence, never raw session metadata."""
from pathlib import Path
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import subprocess

OUT = Path(__file__).resolve().parent
ROOT = Path('/home/dw/Projects/agent-sts2')
LIVE = ROOT / '.worktrees/live'
RUNS = ['Y3824FJLSUXY', 'KWNMCCCNH3P2', 'E420FDJNEDKR', 'GLWXPCHNXS4P']
sha = lambda b: hashlib.sha256(b).hexdigest()


def git(*args):
    return subprocess.check_output(['git', *args], cwd=LIVE)


def tail_rows(path, window):
    size = path.stat().st_size
    start = max(0, size - window)
    rows = []
    with path.open('rb') as stream:
        stream.seek(start)
        if start:
            stream.readline()
        while stream.tell() < size:
            offset = stream.tell()
            raw = stream.readline(size - offset)
            if not raw.endswith(b'\n'):
                break
            try:
                row = json.loads(raw)
            except ValueError:
                continue
            if row.get('run_id') in RUNS:
                rows.append((row, {'offset': offset, 'bytes': len(raw), 'sha256': sha(raw)}))
    return {'file': str(path.relative_to(ROOT)), 'snapshot_bytes': size, 'scan_start': start}, rows


brain_ref, brain = tail_rows(ROOT / 'logs/brain.jsonl', 100_000_000)
call_ref, calls = tail_rows(ROOT / 'logs/codex-calls.jsonl', 8_000_000)
expected = json.loads((OUT / 'mcp-list.json').read_text())['tools']
names = [t['name'] for t in expected]
rows = [r for r, _ in brain]
assert rows and len({r['question_id'] for r in rows}) == len(rows)
assert all(r['tools'] == names for r in rows)
assert all(r['engine'] == 'codex' for r in rows)
counts = Counter(c['name'] for r in rows for c in r.get('tool_calls', []))
summary = {
    'observed_at': datetime.now(timezone.utc).isoformat(),
    'live_head': git('rev-parse', 'HEAD').decode().strip(),
    'brain_snapshot': brain_ref, 'codex_calls_snapshot': call_ref,
    'rows': len(rows), 'distinct_questions': len(rows),
    'first_ts': rows[0]['ts'], 'last_ts': rows[-1]['ts'],
    'all_rows_offer_same_14_tools': True, 'all_rows_codex': True,
    'questions_with_calls': sum(bool(r.get('tool_calls')) for r in rows),
    'call_counts': dict(counts),
    'external_calls': sum(v for k, v in counts.items() if k.startswith('external_stats_')),
    'fallbacks': dict(Counter(str((r.get('agent') or {}).get('fallback')) for r in rows)),
    'maximum_calls_per_question': max(len(r.get('tool_calls', [])) for r in rows),
    'runs': {rid: {'rows': sum(r['run_id'] == rid for r in rows),
                  'calls': dict(Counter(c['name'] for r in rows if r['run_id'] == rid for c in r.get('tool_calls', [])))} for rid in RUNS},
    'labels': {}, 'brain_evidence': [], 'codex_native': [], 'source_comparison': [],
    'historical_transport_evidence': [],
}
for label in sorted({r['label'] for r in rows}):
    selected = [r for r in rows if r['label'] == label]
    summary['labels'][label] = {
        'rows': len(selected), 'with_calls': sum(bool(r.get('tool_calls')) for r in selected),
        'explicit_external_stats_in_question': sum(any(s in r['question'] for s in ['external_stats_', 'sts2.fun', 'sts2fun']) for r in selected),
    }
for row, ref in brain:
    options = {}
    if row['label'] == 'reward/card':
        for key, text in row['options'].items():
            try:
                opt = json.loads(text)
            except ValueError:
                continue
            options[key] = {'card': opt.get('card'), 'keys': list(opt), 'has_id': any(k in opt for k in ['id', 'card_id', 'cardId'])}
    summary['brain_evidence'].append({
        **ref, 'ts': row['ts'], 'run_id': row['run_id'], 'question_id': row['question_id'], 'label': row['label'],
        'offered_tools': row['tools'], 'fallback': (row.get('agent') or {}).get('fallback'),
        'calls': [{'name': c['name'], 'input': c['input'], 'isError': c.get('isError', False)} for c in row.get('tool_calls', [])],
        **({'options': options} if options else {}),
    })
sample = next(r for r in rows if r['label'] == 'reward/card')
summary['card_question_sample'] = {
    'question_id': sample['question_id'], 'question': sample['question'],
    'facts_deck_first_rows': sample['payload']['facts']['deck'][:3],
    'outcome_stats_basis': sample['payload']['facts']['outcome_stats_basis'],
}
question_ids = {r['question_id'] for r in rows}
thread_ids = sorted({r['thread_id'] for r, _ in calls if r.get('question_id') in question_ids and r.get('thread_id')})
sessions = ROOT / 'ops/codex-ops/accounts/codex3/brain/sessions'
for tid in thread_ids:
    paths = [p for day in ['2026/10/22', '2026/10/23'] for p in (sessions / day).glob(f'*{tid}*.jsonl')]
    if not paths:
        summary['codex_native'].append({'thread_id': tid, 'available_native_files': 0,
                                       'status': 'not_retained_at_readback; no native metadata inferred'})
        continue
    # The deployed close path may remove a completed thread and all its forks.
    p = sorted(paths)[0]
    with p.open('rb') as stream:
        raw = stream.readline()
    meta = json.loads(raw)
    assert meta['type'] == 'session_meta'
    payload = meta['payload']
    dynamic = payload['dynamic_tools']
    assert len(dynamic) == 1 and dynamic[0]['name'] == 'gkb'
    listed = dynamic[0]['tools']
    assert [t['name'] for t in listed] == names
    assert all(t['description'] == e['description'] and t['inputSchema'] == e['inputSchema'] for t, e in zip(listed, expected))
    summary['codex_native'].append({
        'thread_id': tid, 'available_native_files': len(paths), 'file': str(p.relative_to(ROOT)), 'metadata_bytes': len(raw), 'metadata_sha256': sha(raw),
        'namespace': 'gkb', 'tool_names': [t['name'] for t in listed], 'schema_and_description_equal_current_mcp': True,
        'base_instructions': payload['base_instructions'],
    })
for path in [
    'agent/src/brain/brain.ts', 'agent/src/brain/tools/agent-knowledge.ts',
    'agent/src/brain/tools/knowledge-mcp.ts', 'agent/src/brain/tools/mcp-server.ts',
    'agent/src/brain/tools/external-stats-tools.ts', 'agent/src/brain/engines/knowledge-agent.ts',
    'agent/src/brain/engines/codex-session.ts', 'agent/src/brain/engines/dsh.ts',
    'knowledge/external/sts2fun/silent-a10.json',
]:
    data = (LIVE / path).read_bytes()
    original = git('show', f'c60de438383f8973ae34159f8be2bec0087d55f5:{path}')
    summary['source_comparison'].append({'path': path, 'bytes': len(data), 'sha256': sha(data), 'same_as_R417_behavior': data == original})
    assert data == original
for name in ['offline-codex14.jsonl', 'offline-dsh14.jsonl', 'actual-live-consumers.json']:
    path = f'paper/materials/20261023-issue33-publication-ops/{name}'
    data = git('show', f'main:{path}')
    value = json.loads(data)
    summary['historical_transport_evidence'].append({'path': path, 'sha256': sha(data), 'value': value})
assert len(thread_ids) == len(RUNS)
assert any(r.get('schema_and_description_equal_current_mcp') for r in summary['codex_native'])
output = json.dumps(summary, ensure_ascii=False, indent=2) + '\n'
(OUT / 'diagnostic.json').write_text(output)
print(json.dumps({k: summary[k] for k in ['rows', 'questions_with_calls', 'call_counts', 'external_calls', 'maximum_calls_per_question', 'labels']}, ensure_ascii=False))
