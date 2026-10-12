import collections
import json
from pathlib import Path

O = Path(__file__).parent
E = {e['id']: e for e in json.load(open(O / 'experience-before.json'))['entries']}
R = {r['run_id']: r for r in json.load(open(O / 'run-metadata.json'))}
boss = []
for run in E['silent-lagavulin-siphon-poison-sl']['evidence'] + ['CSLHFCBSC1UM']:
    windows = []
    previous = None
    for raw in map(json.loads, (O / run / 'states.jsonl').open()):
        s = raw['state']
        if not s.get('combat'): continue
        enemy = next((e for e in s['combat']['enemies'] if e['enemy_id'] == 'LAGAVULIN_MATRIARCH'), None)
        if enemy is None: continue
        pp = {p['power_id']: p['amount'] for p in s['combat']['player']['powers']}
        ep = {p['power_id']: p['amount'] for p in enemy['powers']}
        signature = (s['run']['floor'], s['turn'], pp.get('STRENGTH_POWER', 0), pp.get('DEXTERITY_POWER', 0), ep.get('STRENGTH_POWER', 0))
        if previous and signature[0] == previous[0] and signature[1] > previous[1] and signature[2] == previous[2] - 2 and signature[3] == previous[3] - 2 and signature[4] == previous[4] + 2:
            windows.append(dict(ts=raw['ts'], floor=signature[0], turn=signature[1], before=previous[2:], after=signature[2:]))
        previous = signature
    assert R[run]['character'].lower() == 'silent'
    boss.append(dict(run=run, asc=R[run]['ascension'], matching_siphons=len(windows), cases=windows))
assert next(r for r in boss if r['run'] == 'CSLHFCBSC1UM')['matching_siphons'] >= 2
A = json.load(open(O / 'audit.json'))
poison = []
for ident in ['silent-deadly-poison-application', 'silent-haze-group-poison-weak', 'silent-poisoned-stab-components']:
    entry = E[ident]
    cid = entry['scope'].split(':')[1]
    evidence = set(entry['evidence'] + ['CSLHFCBSC1UM'])
    actions = [x for x in A['cards'] if x['run'] in evidence and x['card'] == cid]
    amounts = collections.Counter()
    weak = collections.Counter()
    deltas = collections.Counter()
    unknown = []
    for x in actions:
        dyn = {v['name']: v['current_value'] for v in x['dynamic'] or []}
        if dyn.get('PoisonPower') is not None: amounts[dyn['PoisonPower']] += 1
        if dyn.get('WeakPower') is not None: weak[dyn['WeakPower']] += 1
        before = [e for e in x['before']['enemies'] if cid == 'HAZE' or e['index'] == x['target']]
        for e in before:
            z = next((z for z in x['after']['enemies'] if z['index'] == e['index'] and z['id'] == e['id']), None)
            if z is None:
                unknown.append(dict(run=x['run'], floor=x['floor'], turn=x['turn'], note='目标已退场/索引变化，施毒差未硬补'))
                continue
            deltas[z['powers'].get('POISON_POWER', 0) - e['powers'].get('POISON_POWER', 0)] += 1
    assert set(amounts).issubset({'DEADLY_POISON': {5, 7}, 'HAZE': {4, 6}, 'POISONED_STAB': {3, 4}}[cid]), (cid, amounts)
    poison.append(dict(id=ident, actual_actions=len(actions), template_poison=dict(amounts), template_weak=dict(weak), observed_target_poison_deltas=dict(deltas), unavailable=unknown, limitation='完整支持沿已核机制语义；当步delta含制品/头骨/重放/死亡等组合，不将每个差值单独归因或将出现集合当完整支持分母。'))
result = dict(boss=boss, poison=poison, limitation='吸取只数可见相邻轮完整−2/−2/+2匹配；未匹配的能力抵消/制品/缺帧不当机制反例。')
(O / 'historical-formula-checks.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print('历史族母', len(boss), '局，完整相邻吸取匹配', sum(x['matching_siphons'] for x in boss))
print('三种施毒牌模板及实际变化检查', [(x['id'], x['actual_actions'], x['template_poison']) for x in poison])
