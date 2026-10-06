import bisect
import collections
import hashlib
import json
from pathlib import Path

O = Path(__file__).parent
ROOT = Path('/home/dw/Projects/agent-sts2')
A = json.load(open(O / 'audit.json'))
facts = []
for run in ['TU3XB4CAEDAW', 'V0383V5S9BCQ']:
    S = [json.loads(line) for line in (O / run / 'states.jsonl').open()]
    D = [json.loads(line) for line in (O / run / 'decisions.jsonl').open()]
    assert all(s['state']['run']['character_id'].lower() == 'silent' for s in S)
    stamps = [s['observed_ts'] for s in S]
    for d in D:
        i = max(0, bisect.bisect_right(stamps, d['observed_ts']) - 1)
        assert S[i]['fingerprint'] == d['fingerprint']
    assert len(S) == (791 if run.startswith('TU') else 191)
    assert len(D) == (759 if run.startswith('TU') else 184)
    assert S[-1]['state']['screen'] == 'GAME_OVER'
    assert S[-1]['state']['run']['current_hp'] == 0

def selected(run, floor, turn, card=None, attempt=None):
    return [x for x in A['cards'] if x['run'] == run and x['floor'] == floor and x['turn'] == turn and (card is None or x['card'] == card) and (attempt is None or x['attempt'] == attempt)]

tu = 'TU3XB4CAEDAW'
vo = 'V0383V5S9BCQ'
wail = selected(tu, 35, 6, 'PIERCING_WAIL')[0]
assert wail['before']['enemies'][0]['powers']['STRENGTH_POWER'] == 36
assert wail['after']['enemies'][0]['powers']['STRENGTH_POWER'] == 30
blocks = selected(tu, 35, 6, 'DEFEND_SILENT')
assert len(blocks) == 2
assert [x['after']['block'] for x in blocks] == [9, 18]
end = next(x for x in A['ends'] if x['run'] == tu and x['floor'] == 35 and x['turn'] == 6)
assert end['before']['hp'] - end['after']['hp'] == 15
for x in blocks:
    assert x['before']['powers']['DEXTERITY_POWER'] == 4
form = selected(tu, 40, 5, 'SERPENT_FORM', 4)[0]
assert form['after']['powers']['SERPENT_FORM_POWER'] == 4
triggers = selected(tu, 40, 5, attempt=4)
for card, before, after in [('NOXIOUS_FUMES',16,12), ('ACCELERANT',12,8)]:
    x = next(x for x in triggers if x['card'] == card)
    assert x['before']['enemies'][0]['block'] == before
    assert x['after']['enemies'][0]['block'] == after
    assert x['before']['enemies'][0]['hp'] == x['after']['enemies'][0]['hp'] == 161
end = next(x for x in A['ends'] if x['run'] == tu and x['floor'] == 40 and x['attempt'] == 4 and x['turn'] == 5)
assert end['before']['enemies'][0]['powers']['POISON_POWER'] == 22
assert end['after']['enemies'][0]['hp'] == 118
assert end['after']['enemies'][0]['powers']['POISON_POWER'] == 20
assert end['before']['hp'] == 8 and end['before']['block'] == 0
assert 22 + 21 == 161 - 118
wail2 = selected(vo, 11, 2, 'PIERCING_WAIL')[0]
assert wail2['before']['enemies'][0]['powers'].get('STRENGTH_POWER',0) == 0
assert wail2['after']['enemies'][0]['powers']['STRENGTH_POWER'] == -6
punch = selected(vo, 11, 3, 'SUCKER_PUNCH')[0]
assert punch['before']['enemies'][0]['powers']['STRENGTH_POWER'] == 10
assert punch['after']['enemies'][0]['powers']['WEAK_POWER'] == 1
end = next(x for x in A['ends'] if x['run'] == vo and x['floor'] == 5 and x['turn'] == 5)
assert end['before']['block'] == 18 and end['before']['hp'] == 29 and end['after']['hp'] == 23
assert 'WEAK_POWER' not in end['before']['enemies'][0]['powers']
sl = [x for x in A['attempts'] if x['run'] == tu]
comparison = []
for floor in [30,31,40]:
    rows = [x for x in sl if x['floor'] == floor]
    comparison.append(dict(floor=floor, attempts=len(rows), wins=sum(x['result']=='won' for x in rows), same_order=rows[0]['draws']['order']==rows[-1]['draws']['order'], same_turns=rows[0]['draws']['turns']==rows[-1]['draws']['turns'], cases=rows))
(O/'sl-comparison.json').write_text(json.dumps(comparison,ensure_ascii=False,indent=2)+'\n')
for x in A['cards']:
    if x['run'] in [tu,vo] and x['card'] in ['FOOTWORK','PIERCING_WAIL','ACCELERANT','SERPENT_FORM','NOXIOUS_FUMES','SUCKER_PUNCH']:
        facts.append(x)
(O/'new-mechanism-facts.json').write_text(json.dumps(facts,ensure_ascii=False,indent=2)+'\n')
others=[]
for p in sorted((ROOT/'.worktrees/exp/knowledge/characters/silent').glob('*.json')):
    if p.name=='experience.json':continue
    x=json.load(open(p))
    others.append(dict(file=p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),keys=list(x),meta={k:x[k] for k in ['generated','generated_from','meta','ascensions','note'] if k in x}))
(O/'other-knowledge.json').write_text(json.dumps(others,ensure_ascii=False,indent=2)+'\n')
print('新两局角色、943决策指纹、982状态、减力/敏捷、群蛇扣挡、触媒43毒伤、弃中和6血逐帧断言通过')
print('SL',[(x['floor'],x['attempts'],x['wins'],x['same_order'],x['same_turns']) for x in comparison])
