import collections
import hashlib
import json
import pathlib
import statistics

HERE = pathlib.Path(__file__).resolve().parent
LOGS = pathlib.Path('/home/dw/Projects/agent-sts2/logs')

def freeze(name):
    source = LOGS / name
    size = source.stat().st_size
    digest = hashlib.sha256()
    rows = []
    offset = 0
    with source.open('rb') as stream:
        while offset < size:
            raw = stream.readline(size - offset)
            digest.update(raw)
            try:
                row = json.loads(raw)
            except ValueError:
                break
            rows.append((offset, hashlib.sha256(raw).hexdigest(), row))
            offset += len(raw)
    manifest[name] = dict(path=str(source), bytes=size, complete_bytes=offset, sha256=digest.hexdigest(), rows=len(rows))
    return rows

def stats(rows):
    inputs = [r.get('usage', {}).get('inputTokens') for r in rows]
    cached = [r.get('usage', {}).get('cachedInputTokens') for r in rows]
    paired = [r for r in rows if isinstance(r.get('usage', {}).get('inputTokens'), int) and isinstance(r.get('usage', {}).get('cachedInputTokens'), int)]
    total = sum(r['usage']['inputTokens'] for r in paired)
    hit = sum(r['usage']['cachedInputTokens'] for r in paired)
    times = sorted(r['ms'] for r in rows if isinstance(r.get('ms'), (float, int)))
    return dict(calls=len(rows), questions=len({r.get('question_id') for r in rows}), runs=len({r.get('run_id') for r in rows}),
        outcomes=dict(collections.Counter(r.get('outcome') for r in rows)), models=dict(collections.Counter(f"{r.get('model')}/{r.get('effort')}" for r in rows)),
        missing_input=sum(v is None for v in inputs), missing_cached=sum(v is None for v in cached), paired_calls=len(paired),
        input=sum(v for v in inputs if isinstance(v,int)), cached=hit, cache_ratio=hit/total if total else None,
        output=sum(r.get('usage',{}).get('outputTokens',0) for r in rows), reasoning=sum(r.get('usage',{}).get('reasoningOutputTokens',0) for r in rows),
        mean_input=statistics.mean([v for v in inputs if isinstance(v,int)]) if any(isinstance(v,int) for v in inputs) else None,
        wall_ms=sum(times), median_ms=statistics.median(times) if times else None, p90_ms=times[int((len(times)-1)*.9)] if times else None,
        first=min((r['ts'] for r in rows),default=None), last=max((r['ts'] for r in rows),default=None))

manifest = {}
calls = freeze('codex-calls.jsonl')
configs = freeze('run-config.jsonl')
brains = freeze('brain.jsonl')
quota = freeze('codex-usage.jsonl')
run_configs = {r['run_id']: r for _,_,r in configs}
brain_index = {r.get('question_id'): r for _,_,r in brains if r.get('engine') == 'codex'}
selected = []
for offset, sha, r in calls:
    c = run_configs.get(r.get('run_id'), {})
    if c.get('character') == 'SILENT' and c.get('ascension') == 10:
        selected.append(r)
        r['_source'] = dict(offset=offset, sha256=sha)
        b = brain_index.get(r.get('question_id'),{})
        r['_brain'] = {k:b.get(k) for k in ['system_sha','system_chars','knowledge','limits','usage']}
        r['_config'] = {k:c.get(k) for k in ['ts','code','config_sha','brain','codex_check']}
(HERE/'frozen-a10-calls.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in selected))
(HERE/'frozen-quota.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for _,_,r in quota))
groups = collections.defaultdict(list)
for r in selected:
    groups[r['ts'][:10]].append(r)
previous = None
transitions = collections.defaultdict(list)
for r in selected:
    if previous and previous.get('thread_id') == r.get('thread_id'):
        same = previous['_brain']['system_sha'] == r['_brain']['system_sha']
        same_label = previous['label'] == r['label']
        transitions[f'same_system={same},same_label={same_label}'].append(r)
    previous = r
summary = dict(manifest=manifest, a10=stats(selected), daily={k:stats(v) for k,v in groups.items()}, transitions={k:stats(v) for k,v in transitions.items()}, latest=stats(selected[-100:]), quota_limits='Shared account windows; not attributable to this task or brain alone.', costs='Subscription: token costs are not cash charges. No price assumptions.')
(HERE/'baseline.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in summary.items() if k != 'manifest'},ensure_ascii=False,indent=2))
