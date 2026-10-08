"""Recompute the frozen cut only; no live reads and no account transcript comparison."""
import collections
import hashlib
import importlib.util
import json
import pathlib
import statistics

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[2]
spec = importlib.util.spec_from_file_location('cost', REPO / 'eval/cost.py')
cost = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cost)
rows = [json.loads(line) for line in (HERE / 'frozen-a10-calls.jsonl').read_text().splitlines()]

def summary(rows):
    usage = [cost.tokens(r.get('usage')) for r in rows]
    known = [u for u in usage if u['cache_usage_recorded']]
    input_tokens = sum(u['input_tokens'] for u in known)
    cached = sum(u['cache_hit_tokens'] for u in known)
    times = sorted(r['ms'] for r in rows)
    return dict(calls=len(rows), questions=len({(r['run_id'],r['question_id']) for r in rows}), runs=len({r['run_id'] for r in rows}),
        outcomes=dict(collections.Counter(r['outcome'] for r in rows)), models=dict(collections.Counter(r['model']+'/'+r['effort'] for r in rows)),
        known_cache_calls=len(known), missing_cache_calls=len(rows)-len(known), input_tokens=input_tokens, cached_input_tokens=cached,
        cache_hit_ratio=cached/input_tokens if input_tokens else None, zero_cache_calls=sum(u['cache_usage_recorded'] and u['cache_hit_tokens']==0 for u in usage),
        output_tokens=sum(u['output_tokens'] for u in usage), reasoning_tokens=sum(u['reasoning_tokens'] for u in usage),
        input_per_known_call=input_tokens/len(known) if known else None, wall_ms=sum(times), median_ms=statistics.median(times) if times else None,
        p90_ms=times[int((len(times)-1)*.9)] if times else None, first=min((r['ts'] for r in rows),default=None),last=max((r['ts'] for r in rows),default=None))

by_mode = {mode:summary([r for r in rows if r['mode']==mode]) for mode in ['exec','session']}
transitions = collections.defaultdict(list)
previous = None
for r in rows:
    if r['mode']=='session':
        key='new_thread'
        if previous and previous['thread_id']==r['thread_id']:
            key='same_system_same_label' if previous['label']==r['label'] else 'same_system_changed_label'
            if previous['_brain']['system_sha']!=r['_brain']['system_sha']: key='changed_system_same_thread'
        transitions[key].append(r)
        previous=r
original_cached = sum(r.get('usage',{}).get('cached_input_tokens', 0) for r in rows)
all_stats = summary(rows)
quota = [json.loads(line) for line in (HERE/'frozen-quota.jsonl').read_text().splitlines()]
quota = [r for r in quota if r.get('freshness')=='fresh' and all_stats['first']<=r['sample_observed_at']<=all_stats['last']]
windows = collections.defaultdict(list)
for r in quota:
    for w in r['windows']:
        windows[(w['bucket'],w['window_minutes'],w['resets_at'])].append((r['sample_observed_at'],w['used_percent']))
quota_summary=[]
for key, samples in windows.items():
    samples.sort()
    quota_summary.append(dict(bucket=key[0],window_minutes=key[1],resets_at=key[2],samples=len(samples),first=samples[0],last=samples[-1],
                              used_percent_change=samples[-1][1]-samples[0][1],attribution='shared background traffic; not a brain-only burn rate'))
out = dict(all=all_stats,by_mode=by_mode,latest_100=summary(rows[-100:]),transitions={k:summary(v) for k,v in transitions.items()},
    original_parser=dict(input_tokens=all_stats['input_tokens'],cached_input_tokens=original_cached,cache_hit_ratio=original_cached/all_stats['input_tokens']),
    corrected_parser=dict(input_tokens=all_stats['input_tokens'],cached_input_tokens=all_stats['cached_input_tokens'],cache_hit_ratio=all_stats['cache_hit_ratio']),
    quota=quota_summary, duplicate_physical_identities=len(rows)-len({(r['ts'],r['question_id'],r['attempt'],r['thread_id']) for r in rows}),
    comparison_limits='No frozen same-model/CLI/window learner or ops sample; 95% is not used as a matched comparison.',
    isolated_experiment=dict(status='pending',calls=0,reason='New broker action requires next wake allowlist reload and one operator trigger.'),
    after_production=dict(status='pending',reason='No transport change or new production window claimed. Instrumentation is observable only in new processes.'))
(HERE/'reconciled.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
print(json.dumps({'all':out['all'],'by_mode':by_mode,'original_parser':out['original_parser'],'corrected_parser':out['corrected_parser'],'quota':quota_summary},ensure_ascii=False,indent=2))
