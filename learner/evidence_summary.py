#!/usr/bin/env python3
"""Build a bounded evidence index, not game knowledge, before reading raw run data."""
import argparse
from collections import Counter, deque
import hashlib
import json
from pathlib import Path
import re

from extract_evidence import run_identity


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
    needles = [run.encode() for run in runs]
    for stream in ('runs', 'decisions'):
        path = logs / (stream + '.jsonl')
        info = {'path': str(path), 'exists': path.exists(), 'invalid_selected_lines': 0,
                'incomplete_lines': 0, 'rows': 0}
        result['sources'].append(info)
        if not path.exists():
            continue
        with path.open('rb') as handle:
            limit = path.stat().st_size
            info['cutoff_bytes'] = limit
            offset = 0
            while offset < limit:
                raw = handle.readline(limit - offset)
                if not raw:
                    raise ValueError('source truncated during scan')
                start = offset
                offset += len(raw)
                info['rows'] += 1
                if not raw.endswith(b'\n'):
                    info['incomplete_lines'] += 1
                    continue
                if not any(needle in raw for needle in needles):
                    continue
                try:
                    row = json.loads(raw)
                except (ValueError, UnicodeDecodeError):
                    info['invalid_selected_lines'] += 1
                    continue
                run = run_identity(row)
                if run not in selected:
                    continue
                ref = {'source': str(path), 'offset': start, 'bytes': len(raw),
                       'sha256': hashlib.sha256(raw).hexdigest()}
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
