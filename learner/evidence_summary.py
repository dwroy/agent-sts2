#!/usr/bin/env python3
"""Build a bounded evidence index, not game knowledge, before reading raw run data."""
import argparse
from collections import Counter, deque
import hashlib
import json
from pathlib import Path
import re

from evidence_identity import run_identity, scan, associate, decision_index, frozen_sizes, identities


def summarize(logs, runs):
    logs = Path(logs)
    selected = set(runs)
    if not 1 <= len(selected) <= 10 or any(not re.fullmatch(r'[A-Z0-9]{12}', run) for run in selected):
        raise ValueError('expected one to ten distinct observed run IDs')
    result = {'schema': 'run-evidence-summary-v1', 'complete_raw_evidence': False,
              'notice': '仅事实计数和有限索引；机制、资源、死因必须按原始行核验，缺失不是零。',
              'sources': [], 'runs': {run: {'outcomes': [], 'decision_count': 0} for run in runs}}
    labels = {run: Counter() for run in runs}
    deciders = {run: Counter() for run in runs}
    fallbacks = {run: Counter() for run in runs}
    refs = {run: deque(maxlen=5) for run in runs}
    cuts = frozen_sizes(logs, ('runs', 'decisions', 'v6-build', 'jev-prompts', 'construction-log'))
    for stream in ('runs', 'decisions'):
        path = logs / (stream + '.jsonl')
        info = {'path': str(path), 'exists': cuts[stream] is not None, 'cutoff_bytes': cuts[stream]}
        result['sources'].append(info)
        for row, ref in scan(path, cuts[stream], info):
            run = run_identity(row)
            if run not in selected:
                continue
            ref['identity'] = {'fields': identities(row)}
            if stream == 'runs':
                # Retain all outcome references, including conflicting duplicate rows.
                result['runs'][run]['outcomes'].append({
                    **{key: row[key] for key in ('ended', 'character', 'floor', 'ascension', 'victory', 'code') if key in row},
                    'ref': ref})
                continue
            result['runs'][run]['decision_count'] += 1
            labels[run][str(row.get('label', '<missing>'))] += 1
            deciders[run][str(row.get('decider', '<missing>'))] += 1
            if row.get('fallback'):
                fallbacks[run][str(row['fallback'])[:160]] += 1
            refs[run].append({**{key: row[key] for key in ('ts', 'floor', 'turn', 'label') if key in row}, 'ref': ref})
    for run, item in result['runs'].items():
        for name, counters in (('labels', labels), ('deciders', deciders), ('fallbacks', fallbacks)):
            item[name] = dict(counters[run].most_common(12))
            item[name + '_other_count'] = sum(counters[run].values()) - sum(item[name].values())
        item['last_five_decision_refs'] = list(refs[run])
    index, decision_source = decision_index(logs / 'decisions.jsonl', runs, cuts['decisions'])
    for stream in ('v6-build', 'jev-prompts'):
        info, gaps, gap_refs = {}, Counter(), deque(maxlen=5)
        counts = dict.fromkeys(runs, 0 if cuts[stream] is not None else None)
        samples = {run: deque(maxlen=5) for run in runs}
        for row, ref in scan(logs / (stream + '.jsonl'), cuts[stream], info):
            run, identity = associate(row, index if stream == 'jev-prompts' else None)
            if run is None:
                gaps[identity['status']] += 1
                gap_refs.append({**ref, 'identity': identity})
            if run not in selected:
                continue
            counts[run] += 1
            samples[run].append({**ref, 'identity': identity,
                                 **{key: row[key] for key in ('decision_id', 'question_id', 'kind', 'mode') if key in row}})
        info['identity_gaps'] = dict(gaps)
        info['identity_gap_refs'] = list(gap_refs)
        info['identity_gap_refs_limit'] = 5
        info['counts'] = counts
        if stream == 'jev-prompts':
            info['decision_identity_source'] = decision_source
        result['sources'].append(info)
        for run in runs:
            result['runs'][run][stream] = {'count': counts[run], 'last_five_refs': list(samples[run]),
                'status': 'missing' if counts[run] is None else 'matched' if counts[run] else 'no_match',
                'consumption_or_benefit': None}
    info = {}
    for row, ref in scan(logs / 'construction-log.jsonl', cuts['construction-log'], info):
        run = run_identity(row)
        if run in selected:
            result['runs'][run]['construction_log'] = {
                'entry_count': len(row.get('entries', [])), 'omitted': row.get('omitted'), 'ref': ref}
    result['sources'].append(info)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--logs', type=Path, required=True)
    parser.add_argument('--runs', required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    result = summarize(args.logs, args.runs.split(','))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(json.dumps({'path': str(args.out), 'bytes': args.out.stat().st_size,
                      'sha256': hashlib.sha256(args.out.read_bytes()).hexdigest()}))


if __name__ == '__main__':
    main()
