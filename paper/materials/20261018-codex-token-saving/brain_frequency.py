#!/usr/bin/env python3
"""Supplement the original frozen audit, accepting both historical usage field schemas."""
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]
BASE = OUT.parent / '20261018-codex-usage-plan'
START, END = '2026-10-17T09:00:00', '2026-10-18T05:20:00'
FIELDS = {'input_tokens': 'inputTokens', 'cached_input_tokens': 'cachedInputTokens',
          'output_tokens': 'outputTokens', 'reasoning_output_tokens': 'reasoningOutputTokens'}


def normalize(usage):
    return {key: usage.get(key, usage.get(alias, 0)) or 0 for key, alias in FIELDS.items()}


assert normalize({'inputTokens': 30, 'cachedInputTokens': 20})['input_tokens'] == 30
assert normalize({'input_tokens': 30, 'cached_input_tokens': 20})['cached_input_tokens'] == 20

old = json.loads((BASE / 'summary.json').read_text())
cutoff = old['brain_trace_source']['cutoff_bytes']
path = ROOT / 'logs/codex-calls.jsonl'
labels, outcomes, models, efforts, schemas = (Counter() for _ in range(5))
runs = defaultdict(Counter)
totals, camel_totals = Counter(), Counter()
refs = []
rows_with_usage = missing_usage = 0
offset = 0
with path.open('rb') as handle:
    while offset < cutoff:
        raw = handle.readline(cutoff - offset)
        if not raw:
            raise ValueError('source truncated before original cutoff')
        here = offset
        offset += len(raw)
        try:
            row = json.loads(raw)
        except ValueError:
            continue
        if not START <= str(row.get('ts'))[:19] < END:
            continue
        label, run = str(row.get('label')), str(row.get('run_id'))
        labels[label] += 1
        outcomes[str(row.get('outcome'))] += 1
        models[str(row.get('model'))] += 1
        efforts[str(row.get('effort'))] += 1
        runs[run]['attempt_rows'] += 1
        runs[run][label] += 1
        usage = row.get('usage')
        values = normalize(usage or {})
        if isinstance(usage, dict):
            rows_with_usage += 1
            schema = 'snake_case' if 'input_tokens' in usage else 'camelCase'
            schemas[schema] += 1
            totals.update(values)
            if schema == 'camelCase':
                camel_totals.update(values)
        else:
            missing_usage += 1
        refs.append(dict(ts=row['ts'], run_id=run, label=label, offset=here, bytes=len(raw),
                         sha256=hashlib.sha256(raw).hexdigest(), usage=values if isinstance(usage, dict) else None))
assert rows_with_usage == old['brain_trace_source']['windows']['aligned_hearthstone']['observed_trace_calls']
assert totals['input_tokens'] == old['brain_trace_source']['windows']['aligned_hearthstone']['trace_input_tokens'] + camel_totals['input_tokens']
assert totals['cached_input_tokens'] == old['brain_trace_source']['windows']['aligned_hearthstone']['trace_cached_input_tokens'] + camel_totals['cached_input_tokens']
native_input = old['totals']['aligned_hearthstone']['input_tokens']
native_cache = old['totals']['aligned_hearthstone']['cached_input_tokens']
combined_input = native_input + totals['input_tokens']
combined_cache = native_cache + totals['cached_input_tokens']
result = dict(source=str(path), cutoff_bytes=cutoff, original_frozen_cutoff_reused=True,
              window_start=START+'Z', window_end=END+'Z', trace_rows=sum(labels.values()),
              rows_with_usage=rows_with_usage, usage_unavailable_rows=missing_usage,
              usage_schemas=dict(schemas), totals=dict(totals), corrected_camelCase_totals=dict(camel_totals),
              labels=dict(labels), outcomes=dict(outcomes), runs=dict(runs), models=dict(models), efforts=dict(efforts),
              brain_cache_fraction=totals['cached_input_tokens']/totals['input_tokens'],
              known_combined_input=combined_input, known_combined_cache=combined_cache,
              known_combined_cache_fraction=combined_cache/combined_input,
              brain_share_known_uncached=(totals['input_tokens']-totals['cached_input_tokens'])/(combined_input-combined_cache),
              limitation='Trace rows are attempts, not unique questions. Original audit found all 533 native files missing. No per-trace account identity established; unknown usage is not zero.')
(OUT/'brain-frequency.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
(OUT/'brain-numeric-references.json').write_text(json.dumps(refs, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({k: v for k, v in result.items() if k not in ('runs','labels','limitation')}, ensure_ascii=False))
