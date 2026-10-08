#!/usr/bin/env python3
"""One bounded cache snapshot, for a completed event; does not poll or read account credentials."""
import argparse
import collections
import hashlib
import json
import pathlib
import statistics
import cost


def cut_rows(path, manifest):
    limit = path.stat().st_size if path.is_file() else 0
    digest = hashlib.sha256()
    read = 0
    with path.open('rb') if path.is_file() else open('/dev/null', 'rb') as stream:
        while read < limit:
            line = stream.readline(limit - read)
            if not line.endswith(b'\n'):
                break
            digest.update(line)
            read += len(line)
            yield json.loads(line)
    manifest[str(path)] = {'complete_bytes': read, 'sha256': digest.hexdigest()}


def summarize(rows):
    unique = {}
    for r in rows:
        identity = (r.get('ts'), r.get('run_id'), r.get('question_id'), r.get('attempt'), r.get('thread_id'))
        unique.setdefault(identity, r)
    calls = list(unique.values())
    usage = [cost.tokens(r.get('usage')) for r in calls]
    paired = [u for u in usage if u['cache_usage_recorded']]
    inputs = sum(u['input_tokens'] for u in paired)
    cached = sum(u['cache_hit_tokens'] for u in paired)
    times = sorted(cost.num(r.get('ms', r.get('call_ms'))) for r in calls)
    return {'physical_calls': len(calls), 'duplicate_rows': len(rows)-len(calls),
            'questions': len({(r.get('run_id'),r.get('question_id')) for r in calls}),
            'runs': sorted({r.get('run_id') for r in calls if r.get('run_id')}),
            'outcomes': dict(collections.Counter(r.get('outcome') for r in calls)),
            'model_effort': dict(collections.Counter(f"{r.get('model')}/{r.get('effort')}" for r in calls)),
            'cache_known_calls': len(paired), 'cache_unknown_calls': len(calls)-len(paired),
            'input_tokens_observed': inputs, 'cached_input_tokens_observed': cached,
            'cache_hit_ratio_observed': cached/inputs if inputs else None,
            'zero_cache_calls': sum(u['cache_hit_tokens']==0 for u in paired),
            'output_tokens': sum(u['output_tokens'] for u in usage), 'reasoning_tokens': sum(u['reasoning_tokens'] for u in usage),
            'input_per_known_call': inputs/len(paired) if paired else None,
            'wall_ms': sum(times), 'median_ms': statistics.median(times) if times else None,
            'p90_ms': times[int((len(times)-1)*.9)] if times else None}


def snapshot(logs, after=None):
    manifest = {}
    configs = {r['run_id']: r for r in cut_rows(logs/'run-config.jsonl', manifest) if r.get('run_id')}
    rows = [r for r in cut_rows(logs/'codex-calls.jsonl', manifest)
            if configs.get(r.get('run_id'),{}).get('character','').lower()=='silent'
            and configs.get(r.get('run_id'),{}).get('ascension')==10
            and (after is None or str(r.get('ts',''))>=after)]
    groups = collections.defaultdict(list)
    for r in rows:
        o = r.get('cache_request', {})
        group = json.dumps([r.get('mode'),r.get('model'),r.get('effort'),r.get('thread_id'),
                            o.get('instructions',{}).get('sha256'),o.get('schema',{}).get('sha256'),o.get('service_tier')])
        groups[group].append(r)
    brains = {(r.get('run_id'),r.get('question_id')):r for r in cut_rows(logs/'brain.jsonl', manifest)
              if r.get('engine')=='codex' and (after is None or str(r.get('ts',''))>=after)}
    mismatches = 0
    for r in rows:
        b = brains.get((r.get('run_id'),r.get('question_id')))
        u = cost.tokens(r.get('usage'))
        if b and u['cache_usage_recorded'] and not b.get('reasks'):
            mismatches += cost.tokens(b.get('usage'))['cache_hit_tokens'] != u['cache_hit_tokens']
    return {'scope':'Silent A10, all observed physical calls, input includes cache; output includes reasoning',
            'after':after, 'manifest':manifest, 'total':summarize(rows), 'by_request_context':{k:summarize(v) for k,v in groups.items()},
            'brain_cache_mismatch_rows':mismatches, 'limits':'Missing usage is unknown. Shared subscription quota and USD are not attributable to brain alone.'}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--logs', type=pathlib.Path, default=pathlib.Path(__file__).resolve().parents[1]/'logs')
    parser.add_argument('--after', help='Inclusive UTC ISO timestamp, as in codex-calls.jsonl')
    parser.add_argument('--out', type=pathlib.Path, required=True)
    args=parser.parse_args()
    result=snapshot(args.logs,args.after)
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result['total'],ensure_ascii=False))
