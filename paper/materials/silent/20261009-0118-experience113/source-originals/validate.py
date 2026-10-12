import collections
import json
from pathlib import Path

O = Path(__file__).parent
E = json.load(open('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json'))
B = json.load(open(O / 'experience-before.json'))
C = json.load(open(O / 'changes.json'))['entries']
R = {r['run_id']: r for r in json.load(open(O / 'run-metadata.json'))}
A = json.load(open(O / 'audit.json'))
assert len({e['id'] for e in E['entries']}) == len(E['entries'])
allowed = {'boss', 'elite', 'hallway', 'act', 'general', 'card', 'relic', 'potion', 'event'}
changed = {c['id'] for c in C}
for e in E['entries']:
    assert e['scope'].split(':')[0] in allowed
    if e['id'] not in changed:
        assert e == next(x for x in B['entries'] if x['id'] == e['id'])
        continue
    assert e['n_support'] == len(set(e['evidence']))
    assert e['n_contradict'] == len(set(e.get('contradicting', [])))
    assert not set(e['evidence']) & set(e.get('contradicting', []))
    assert all(len(r) == 12 and R[r]['character'].lower() == 'silent' for r in e['evidence'] + e.get('contradicting', []))
    n = e['n_support']
    expected = 'high' if n >= 5 and e['n_contradict'] <= n / 3 else 'med' if n >= 2 else 'low'
    assert e['confidence'] == expected
    assert e['last_seen'] == '2026-10-08'
    if e['scope'].split(':')[0] in ['card', 'relic', 'potion', 'event']:
        assert e.get('name')
assert sum(len(e['lesson']) for e in E['entries'] if e['status'] == 'active') == 51768
assert sum(e['status'] == 'active' for e in E['entries']) == 188
transitions = []
entry = next(e for e in E['entries'] if e['id'] == 'silent-act-transition-missing-hp-heal')
for run in entry['evidence']:
    states = [json.loads(l)['state'] for l in (O / run / 'states.jsonl').open()]
    found = False
    for fight in [f for f in A['fights'] if f['run'] == run and f['type'] == 'Boss' and not f['death']]:
        before = [s for s in states if s['run']['floor'] == fight['floor']]
        after = [s for s in states if s['run']['floor'] == fight['floor'] + 1]
        first = next(s for s in before if s.get('combat'))
        if not after or after[0]['run']['act_id'] == first['run']['act_id']:
            continue
        a, z = before[-1]['run'], after[0]['run']
        row = dict(run=run, floor=fight['floor'], before=a['current_hp'], after=z['current_hp'], max_before=a['max_hp'], max_after=z['max_hp'], expected=(a['max_hp'] - a['current_hp']) * 4 // 5, observed=z['current_hp'] - a['current_hp'])
        assert row['max_before'] == row['max_after'] and row['expected'] == row['observed'], row
        transitions.append(row)
        found = True
    assert found, run
new = [json.loads(l)['state'] for l in (O / 'LY83ZMTFVKJH/states.jsonl').open()]
for turn in [8, 11]:
    s = next(s for s in new if s['run']['floor'] == 21 and s['turn'] == turn)
    assert not any(p['power_id'] == 'STRANGLE_POWER' for e in s['combat']['enemies'] for p in e['powers'])
strangle = next(e for e in E['entries'] if e['id'] == 'silent-strangle-following-card-hp-loss')
strangles = [r for r in A['cards'] if r['card'] == 'STRANGLE' and r['run'] in strangle['evidence']]
assert set(r['run'] for r in strangles) == set(strangle['evidence'])
for r in strangles:
    target = r['target']
    enemy = next((e for e in r['after']['enemies'] if e['index'] == target), None)
    if enemy is not None and enemy['alive']:
        assert enemy['powers'].get('STRANGLE_POWER') == 2, r
(O / 'cross-act-history.json').write_text(json.dumps(transitions, ensure_ascii=False, indent=2) + '\n')
summary = dict(changed_entries=len(C), cross_act_runs=len(entry['evidence']), cross_act_windows=len(transitions), strangle_runs=len(strangle['evidence']), strangle_plays=len(strangles), all_other_entries_equal=True)
(O / 'validation.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
print(summary)
