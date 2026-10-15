#!/usr/bin/env python3
"""Descriptive S usage audit for the 2026-10-16 Roy/Claude global-build discussion.

Reads logs/decisions.jsonl in a fixed byte window [START, END) (START = first decision of
WJ0LTVSSDY61, the first P1/P3-on run) and logs/run-plans.jsonl; writes JSON to stdout.
Counts only; no causal claims. Usage: s_usage.py START END
"""
import collections, json, sys

START, END = int(sys.argv[1]), int(sys.argv[2])

def walk(o):
    if isinstance(o, dict):
        if o.get('schema') == 'build-ranking-v1':
            yield o
        for v in o.values():
            yield from walk(v)
    elif isinstance(o, list):
        for v in o:
            yield from walk(v)

p3 = {}
p2 = {}
with open('logs/decisions.jsonl', 'rb') as f:
    f.seek(START)
    while f.tell() < END:
        line = f.readline()
        if not line:
            break
        if b'"s_ranking"' not in line and b'build-ranking-v1' not in line:
            continue
        try:
            d = json.loads(line)
        except ValueError:
            continue
        bs = d.get('boss_sim') if isinstance(d.get('boss_sim'), dict) else {}
        sr = bs.get('s_ranking')
        if sr:
            comp = bs.get('completion') or {}
            key = (d.get('run_id'), comp.get('key') or comp.get('attempt_id'), json.dumps(sr.get('candidate_keys')))
            p3[key] = (sr, bs.get('boss'), d.get('floor'))
        for br in walk(d):
            if br.get('status') != 'produced':
                continue
            p2[(d.get('run_id'), d.get('decision_id'), br.get('mode'))] = (br, d.get('floor'), bs.get('boss'))

c3 = collections.Counter(); fights = collections.defaultdict(collections.Counter)
for (rid, _, _), (sr, boss, fl) in p3.items():
    c3['unique_questions'] += 1
    fk = f"{rid}|F{fl}|{boss}"
    fights[fk]['questions'] += 1
    if sr.get('used'):
        c3['s_used'] += 1
        if len(sr.get('win_group') or []) > 1:
            c3['win_tied_more_than_one'] += 1
        if sr.get('best') != sr.get('old_best'):
            c3['s_changed_top_plan'] += 1
            fights[fk]['s_changed_top_plan'] += 1
    else:
        c3['not_used_' + str(sr.get('reason'))] += 1

c2 = collections.defaultdict(collections.Counter); acts = collections.defaultdict(collections.Counter); targets = collections.Counter()
for (rid, _, mode), (br, fl, boss) in p2.items():
    c = c2[mode]; c['questions'] += 1
    rows = br.get('rows') or []
    if not rows:
        c['no_rows'] += 1
        continue
    if len(rows) >= 2:
        c['two_or_more_options'] += 1
    if br.get('win_saturated'):
        c['win_saturated'] += 1
    if any(x.get('metric') == 'S' and x.get('key') != x.get('reference') and abs(x.get('mean') or 0) > 2 * (x.get('se') or 0)
           for x in br.get('comparisons') or []):
        c['s_separated_options'] += 1
    sel = br.get('selection') or {}
    if sel.get('choice') is not None:
        c['chosen'] += 1
        c['chose_best_group'] += sel.get('choice') in (br.get('best_group') or [])
        c['deviated'] += sel.get('deviated') is True
    if mode == 'on':
        act = 1 if (fl or 0) <= 17 else 2 if fl <= 33 else 3
        a = acts[act]; a['questions'] += 1; a['win_saturated'] += bool(br.get('win_saturated'))
        a['low_trust'] += bool(br.get('low_trust')); a['all_rows_s_eligible'] += all(r.get('s_eligible') for r in rows)
        targets[f"act{act}:{boss}"] += 1

directions = collections.Counter(); plans = 0
for line in open('logs/run-plans.jsonl', 'rb'):
    if b'"construction"' not in line:
        continue
    try:
        d = json.loads(line)
    except ValueError:
        continue
    stack = [d]
    while stack:
        o = stack.pop()
        if isinstance(o, dict):
            c = o.get('construction')
            if isinstance(c, dict) and 'primary' in c:
                directions[c['primary']] += 1; plans += 1
                break
            stack.extend(o.values())

print(json.dumps({'window': {'decisions_jsonl': [START, END]},
                  'p3_combat_s_ranking': dict(c3),
                  'p3_fights_where_s_changed_top_plan': {k: dict(v) for k, v in fights.items() if v['s_changed_top_plan']},
                  'p2_build_ranking_by_mode': {k: dict(v) for k, v in c2.items()},
                  'p2_on_by_act': {k: dict(v) for k, v in sorted(acts.items())},
                  'p2_on_target_bosses': dict(targets.most_common()),
                  'run_plan_construction_primary': {'plans': plans, 'counts': dict(directions.most_common())}},
                 ensure_ascii=False, indent=1))
