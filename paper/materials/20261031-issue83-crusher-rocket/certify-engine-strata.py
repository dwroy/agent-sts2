#!/usr/bin/env python3
"""Read original accepted brain records; never infer a commit from release time."""
from collections import defaultdict, Counter
import datetime as dt
import hashlib
import json
from pathlib import Path
import sys
import argparse

TREE = Path(__file__).resolve().parents[3]
ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = TREE / '.artifacts/issue83/crusher-rocket'
sys.path[:0] = [str(TREE / 'agent/tools/logdb'), str(TREE / 'eval')]
import query
import sync
import brain_source


def utc(value):
    t = dt.datetime.fromisoformat(str(value).replace('Z', '+00:00'))
    return (t.replace(tzinfo=dt.timezone.utc) if t.tzinfo is None else t).astimezone(dt.timezone.utc)


def main(expanded=False):
    inventory = json.loads((OUT / 'combined-own-inventory.json').read_text())
    upper = utc('2026-10-31T18:16:00+08:00')
    rows = [r for b in inventory.values() for r in b['rows']]
    run_ids = {r['run_id'] for r in rows}
    if expanded:
        run_ids.update(json.loads(line)['run_id'] for line in (OUT / 'formal-model/formal-fights.jsonl').read_text().splitlines())
    runs = sorted(run_ids)
    brain = ROOT / 'logs/brain.jsonl'
    prefix = brain.stat().st_size
    with sync.read_lock(str(ROOT / 'data/logdb'), shared=True, wait=False) as held:
        if not held:
            raise RuntimeError('locator busy; no source writes or waiting under lock')
        con = query.connect(str(ROOT / 'data/logdb'), threads=1)
        refs = con.execute("SELECT run_id,off,len,ts FROM llm_calls_raw WHERE src='brain' "
            "AND run_id IN (SELECT unnest(?::VARCHAR[])) AND ts<=? AND off+len<=? ORDER BY off",
            [runs, upper.replace(tzinfo=None), prefix]).fetchall()
        manifest = (ROOT / 'data/logdb/manifest.json').read_bytes()
        con.close()
    by_run, witnesses = defaultdict(list), []
    with brain.open('rb') as handle:
        for run, off, length, _ in refs:
            handle.seek(off)
            raw = handle.read(length)
            r = json.loads(raw)
            assert r.get('run_id') == run and utc(r['ts']) <= upper
            lean = {k: r.get(k) for k in ['engine', 'ts', 'question_id', 'label', 'error', 'problems', 'accepted']}
            lean['answer'] = True if r.get('answer') is not None else None
            by_run[run].append(lean)
            witnesses.append({'run_id': run, 'off': off, 'len': length, 'sha256': hashlib.sha256(raw).hexdigest()})
    cohorts = {run: brain_source.classify(by_run[run]) for run in runs}
    configs = defaultdict(list)
    frozen = TREE / '.artifacts/issue83/later-val-20261031-r2/run-config.jsonl'
    for line in frozen.read_text().splitlines():
        r = json.loads(line)
        if r.get('run_id') in cohorts and r.get('ts'):
            configs[r['run_id']].append(r)
    for values in configs.values():
        values.sort(key=lambda r: utc(r['ts']))
    result = {}
    for boss, record in inventory.items():
        first, strata = [], defaultdict(list)
        for r in record['rows']:
            if r['attempt'] != 1:
                continue
            prior = [c for c in configs[r['run_id']] if utc(c['ts']) <= utc(r['first_ts'])]
            c = prior[-1] if prior else {}
            code = c.get('code') or {}
            item = {**r, 'engine_source': cohorts[r['run_id']]['source'], 'code_commit': code.get('commit'),
                    'code_dirty': code.get('dirty'), 'config_sha': c.get('config_sha'), 'config_error': code.get('error'),
                    'game_version': c.get('game_version')}
            first.append(item)
            strata[(item['engine_source'], item['code_commit'], item['code_dirty'])].append(item)
        result[boss] = {'first': len(first), 'engines': dict(Counter(r['engine_source'] for r in first)),
            'strata': [{'engine': key[0], 'commit': key[1], 'dirty': key[2], 'first': len(values),
                       'outcomes': dict(Counter(r['outcome'] for r in values))}
                      for key, values in sorted(strata.items(), key=lambda pair: str(pair[0]))], 'rows': first}
    destination = OUT / ('engine-strata-global.json' if expanded else 'engine-strata.json')
    if destination.exists():
        raise RuntimeError('Original audit retained; use an explicit successor')
    destination.write_text(json.dumps({'policy': brain_source.POLICY, 'window_upper': upper.isoformat(),
        'brain_prefix_bound': prefix, 'locator_sha256': hashlib.sha256(manifest).hexdigest(),
        'run_cohorts': cohorts, 'raw_witnesses': witnesses, 'bosses': result,
        'unknown_commit_not_backfilled': True}, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({b: {k: v for k, v in r.items() if k != 'rows'} for b, r in result.items()}, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--all-formal', action='store_true')
    main(parser.parse_args().all_formal)
