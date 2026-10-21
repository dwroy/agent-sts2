#!/usr/bin/python3
"""Freeze seven days of operational error evidence without copying prompts or secrets."""
import collections
import datetime as dt
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LOGS = Path('/home/dw/Projects/agent-sts2/logs')
OUT = ROOT / 'paper/materials/issue29-brain-speed/availability.json'
PATTERNS = {
    'capacity': r'at capacity|selected model.{0,60}capacity|server.overloaded|insufficient capacity|overloaded',
    'rate_limit': r'rate.?limit|too many requests|(?:HTTP|status(?: code)?)[^\d]{0,8}429\b',
    'quota_guard': r'usage guard|codex usage|quota|plan.s included usage|credits (?:are|in use)|usage limit',
}


def classify(text):
    return [name for name, pattern in PATTERNS.items() if re.search(pattern, text, re.I)]


def collect():
    if OUT.exists():
        raise SystemExit('Frozen availability evidence exists; preserve it')
    end = dt.datetime.now(dt.timezone.utc)
    start = end - dt.timedelta(days=7)
    files = {}
    records = []
    waits = []
    denominators = collections.Counter()
    for name in ['brain.jsonl', 'codex-calls.jsonl', 'brain-wait.jsonl']:
        path = LOGS / name
        if not path.exists():
            files[name] = {'missing': True}
            continue
        size = path.stat().st_size
        digest = hashlib.sha256()
        with path.open('rb') as f:
            while f.tell() < size:
                offset = f.tell()
                raw = f.readline(size - offset)
                digest.update(raw)
                try:
                    row = json.loads(raw)
                    ts = dt.datetime.fromisoformat(row['ts'].replace('Z', '+00:00'))
                except (ValueError, KeyError):
                    continue
                if not start <= ts <= end:
                    continue
                engine = row.get('engine', 'codex')
                denominators[f'{name}:{engine}'] += 1
                if name == 'brain-wait.jsonl':
                    waits.append({k: row.get(k) for k in ['ts', 'pid', 'run_id', 'question_id', 'state', 'since', 'retries',
                                                         'next_retry', 'suspended_ms', 'budget_policy']})
                    waits[-1]['categories'] = classify(row.get('reason', ''))
                    waits[-1]['offset'] = offset
                    continue
                error_text = json.dumps({k: row.get(k) for k in ['error', 'errors', 'retries', 'notes', 'fell_back_from']}, ensure_ascii=False)
                # Severity lines can expose capacity errors missing from the structured stream.
                stderr = '\n'.join(s for s in row.get('stderr_tail', '').splitlines() if re.search(r'\b(?:WARN|ERROR)\b', s))
                categories = classify(error_text + '\n' + stderr)
                failed = row.get('outcome') not in [None, 'answered'] or (name == 'brain.jsonl' and not row.get('accepted'))
                if not categories and not failed and not row.get('fell_back_from'):
                    continue
                records.append({'source': name, 'offset': offset, 'ts': row['ts'], 'run_id': row.get('run_id'),
                                'question_id': row.get('question_id'), 'label': row.get('label'), 'engine': engine,
                                'categories': categories, 'outcome': row.get('outcome'), 'accepted': row.get('accepted'),
                                'latency_ms': row.get('latency_ms', row.get('ms')), 'attempt': row.get('attempt'),
                                'retries': len(row.get('retries') or []), 'reasks': row.get('reasks'),
                                'fell_back_from': (row.get('fell_back_from') or {}).get('engine'),
                                'primary_ms': row.get('primary_ms'), 'error_kind': row.get('error_kind')})
        files[name] = {'frozen_bytes': size, 'sha256': digest.hexdigest()}
    summary = {}
    for name in ['brain.jsonl', 'codex-calls.jsonl']:
        selected = [r for r in records if r['source'] == name]
        summary[name] = {category: {'rows': sum(category in r['categories'] for r in selected),
                                   'questions_with_id': len({(r['run_id'], r['question_id']) for r in selected
                                                           if category in r['categories'] and r['question_id']}),
                                   'row_latency_ms': sum(r['latency_ms'] or 0 for r in selected if category in r['categories'])}
                         for category in PATTERNS}
    value = {'start_inclusive': start.isoformat(), 'end_inclusive': end.isoformat(), 'files': files,
             'denominators': dict(denominators), 'classification_regex': PATTERNS,
             'summary': summary, 'records': records, 'waits': waits,
             'limits': 'Source-row latency is not additive across the two logs. Categories may overlap. '
                       'Rate-limit strings can describe local quota guards; separate quota_guard and inspect original offsets. '
                       'Wait suspended_ms is cumulative per process; do not sum heartbeat or completed totals.'}
    OUT.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'denominators': dict(denominators), 'summary': summary, 'wait_rows': len(waits)}))


def collect_decisions():
    """Follow exact request IDs to action receipts; never infer a fallback from an error alone."""
    target = OUT.with_name('availability-decisions.json')
    if target.exists():
        raise SystemExit('Frozen decision evidence exists; preserve it')
    evidence = json.loads(OUT.read_text())
    ids = {row['question_id'] for row in evidence['records']
           if row.get('question_id') and row['categories']}
    encoded = {qid: qid.encode() for qid in ids}
    path = LOGS / 'decisions.jsonl'
    size = path.stat().st_size
    digest = hashlib.sha256()
    records = []
    with path.open('rb') as source:
        while source.tell() < size:
            offset = source.tell()
            raw = source.readline(size - offset)
            digest.update(raw)
            matches = [qid for qid, needle in encoded.items() if needle in raw]
            if not matches:
                continue
            row = json.loads(raw)
            record = {k: row.get(k) for k in ['ts', 'run_id', 'decision_id', 'label', 'screen', 'floor',
                                              'decider', 'fallback', 'reasked', 'request_ids', 'latency_ms', 'result']}
            record['matched_question_ids'] = matches
            record['offset'] = offset
            # Preserve the decision budget receipt without its potentially large stage trace.
            record['time_budget'] = {k: v for k, v in (row.get('time_budget') or {}).items() if k != 'stages'}
            records.append(record)
    target.write_text(json.dumps({'source': 'logs/decisions.jsonl', 'frozen_bytes': size,
                                  'sha256': digest.hexdigest(), 'searched_question_ids': sorted(ids),
                                  'records': records}, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'question_ids': len(ids), 'matched_decisions': len(records)}))


def collect_neighbors():
    """Retain temporal neighbors separately when decisions do not carry brain question IDs."""
    target = OUT.with_name('availability-action-neighbors.json')
    if target.exists():
        raise SystemExit('Frozen neighbor evidence exists; preserve it')
    original = json.loads(OUT.with_name('availability-decisions.json').read_text())
    episodes = json.loads(OUT.with_name('availability-episodes.json').read_text())['episodes']
    path = LOGS / 'decisions.jsonl'
    digest = hashlib.sha256()
    records = []
    instant = lambda value: dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
    with path.open('rb') as source:
        while source.tell() < original['frozen_bytes']:
            offset = source.tell()
            raw = source.readline(original['frozen_bytes'] - offset)
            digest.update(raw)
            possible = [episode for episode in episodes if episode['run_id'].encode() in raw]
            if not possible:
                continue
            row = json.loads(raw)
            for episode in possible:
                if row.get('run_id') != episode['run_id']:
                    continue
                end = instant(episode['since']) + dt.timedelta(milliseconds=episode['episode_ms'])
                delta = (instant(row['ts']) - end).total_seconds()
                if not -5 <= delta <= 10:
                    continue
                record = {k: row.get(k) for k in ['ts', 'run_id', 'decision_id', 'label', 'screen', 'floor',
                                                  'decider', 'fallback', 'chosen', 'request_ids', 'latency_ms']}
                record.update({'episode_question_id': episode['question_id'], 'seconds_from_episode_end': delta,
                               'offset': offset, 'join': 'run_id and temporal proximity only; no exact question ID'})
                record['time_budget'] = {k: v for k, v in (row.get('time_budget') or {}).items() if k != 'stages'}
                records.append(record)
    if digest.hexdigest() != original['sha256']:
        raise SystemExit('Original decision log prefix changed')
    target.write_text(json.dumps({'source': original['source'], 'frozen_bytes': original['frozen_bytes'],
                                  'sha256': digest.hexdigest(), 'records': records}, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'temporal_neighbors': len(records)}))


if __name__ == '__main__':
    if '--decisions' in sys.argv:
        collect_decisions()
    elif '--neighbors' in sys.argv:
        collect_neighbors()
    else:
        collect()
