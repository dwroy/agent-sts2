import bisect
import collections
import hashlib
import json
import re
from pathlib import Path

O = Path(__file__).parent
ROOT = O.parents[2]
A = json.load(open(O / 'audit.json'))
E = {e['id']: e for e in json.load(open(ROOT / '.worktrees/exp/knowledge/characters/silent/experience.json'))['entries']}
R = {r['run_id']: r for r in json.load(open(O / 'completed-runs.json'))}
RUN = 'HUVEPWQAHWFU'
S = [json.loads(x) for x in (O / RUN / 'states.jsonl').open()]
D = [json.loads(x) for x in (O / RUN / 'decisions.jsonl').open()]
T = {x['ts']: x['state'] for x in S}
stamps = [x['ts'] for x in S]

def powers(p):
    return {x['power_id']: x['amount'] for x in p.get('powers', [])}

def nextstate(d):
    return S[min(bisect.bisect_right(stamps,d['ts']),len(S)-1)]['state']

turns = {}
for d in D:
    if d['screen'] == 'COMBAT' and d['floor'] == 35:
        turns.setdefault(d['turn'],T[d['ts']])
enemies = [turns[t]['combat']['enemies'][0] for t in range(3,7)]
assert [powers(e)['STRENGTH_POWER'] for e in enemies] == [9,18,27,36]
assert powers(turns[2]['combat']['enemies'][0])['RITUAL_POWER'] == 9
assert [sum(i.get('total_damage') or 0 for i in e['intents']) for e in enemies] == [24,33,31,51]
assert turns[6]['run']['current_hp'] == 18
newcards = [x for x in A['cards'] if x['run'] == RUN]
wail = next(c for c in newcards if c['floor']==35 and c['card']=='PIERCING_WAIL')
assert wail['before']['enemies'][0]['powers']['STRENGTH_POWER'] == 9
assert wail['after']['enemies'][0]['powers']['STRENGTH_POWER'] == 3
defends = [c for c in newcards if c['floor']==35 and c['turn']==3 and c['card']=='DEFEND_SILENT']
assert [c['after']['block']-c['before']['block'] for c in defends] == [10,7]
anticipate = next(c for c in newcards if c['floor']==35 and c['turn']==6 and c['card']=='ANTICIPATE')
assert anticipate['before']['powers']['DEXTERITY_POWER'] == 2
assert anticipate['after']['powers']['DEXTERITY_POWER'] == 4
assert anticipate['before']['block'] == anticipate['after']['block'] == 0
defend = next(c for c in newcards if c['floor']==35 and c['turn']==6 and c['card']=='DEFEND_SILENT')
assert defend['after']['block']-defend['before']['block'] == 9
ends = [x for x in A['ends'] if x['run']==RUN and x['floor']==35]
assert next(c for c in ends if c['turn']==2)['before']['block'] == 6
assert next(c for c in ends if c['turn']==6)['before']['block'] == 9
assert 51-(9+4) == 38 and 38-18 == 20
fumes = [c for c in newcards if c['card']=='NOXIOUS_FUMES' and c['floor'] in [33,35]]
assert len(fumes)==3
assert [(c['floor'],c['attempt'],c['turn'],c['after']['powers']['NOXIOUS_FUMES_POWER']) for c in fumes] == [(33,1,1,2),(33,2,1,2),(35,1,6,2)]
afterimages = [c for c in newcards if c['card']=='AFTERIMAGE' and c['floor']==33]
assert len(afterimages)==2 and all(c['after']['powers']['AFTERIMAGE_POWER']==1 for c in afterimages)
after_turn2 = [c for c in newcards if c['floor']==33 and c['attempt']==2 and c['turn']==2]
assert len(after_turn2)==4 and after_turn2[-1]['after']['block']==4
footwork = next(c for c in newcards if c['floor']==35 and c['card']=='FOOTWORK')
assert footwork['before']['energy']==2 and footwork['after']['energy']==0
assert footwork['after']['powers']['DEXTERITY_POWER']==2
for s in turns.values():
    assert s['combat']['player']['energy']==4
    assert any(r['relic_id']=='SPIKED_GAUNTLETS' for r in s['run']['relics'])
sl = [json.loads(x) for x in (O/RUN/'sl-attempts.jsonl').open() if json.loads(x)['floor']==33]
assert [x['result'] for x in sl]==['predicted_death','won']
assert sl[0]['draws']['order']==sl[1]['draws']['order'] and len(sl[0]['draws']['order'])==31
assert sl[0]['draws']['turns']!=sl[1]['draws']['turns']
first_insert = min(x['at'] for y in sl for x in y['draws']['inserted'])
assert first_insert==9
(O/'sl-comparison.json').write_text(json.dumps(dict(original_order=31,first_insert=first_insert,clean_prefix=9,arrival_turns_equal=False,attempts=sl),ensure_ascii=False,indent=2)+'\n')

mechanisms = {}
card_ids = ['silent-footwork-block','silent-noxious-fumes-growth','silent-afterimage-per-card-block','silent-piercing-wail-temporary-strength','silent-anticipate-temporary-dexterity','silent-metamorphosis-generated-free-attacks']
for id in card_ids:
    e=E[id];card=e['scope'].split(':')[1]
    cases=[c for c in A['cards'] if c['run'] in e['evidence'] and c['card']==card]
    seen={c['run'] for c in cases}
    assert set(e['evidence']) <= seen, (id,set(e['evidence'])-seen)
    mechanisms[id]=dict(support=e['evidence'],contradict=e.get('contradicting',[]),asc=dict(collections.Counter(R[r]['ascension'] for r in e['evidence'])),actual_play_runs=len(seen),cases=cases)
for id in ['silent-spiked-gauntlets-power-cost','silent-ripple-basin-no-attack-block','silent-devoted-sculptor-ritual-growth','silent-strength-weak-observation','silent-insatiable-dual-clock','silent-deck-burst-observation']:
    e=E[id]
    mechanisms[id]=dict(support=e['evidence'],contradict=e.get('contradicting',[]),asc=dict(collections.Counter(R[r]['ascension'] for r in e['evidence'])))

generated=[]
for run in E['silent-metamorphosis-generated-free-attacks']['evidence']:
    rows=[json.loads(x) for x in (O/run/'states.jsonl').open()];tm={x['ts']:x['state'] for x in rows};ts=[x['ts'] for x in rows]
    for d in map(json.loads,(O/run/'decisions.jsonl').open()):
        if (d.get('expect') or {}).get('card',{}).get('id')!='METAMORPHOSIS' or (d.get('chosen') or {}).get('action')!='play_card':continue
        before=tm[d['ts']];after=rows[min(bisect.bisect_right(ts,d['ts']),len(rows)-1)]['state']
        assert len(after['combat']['hand'])==len(before['combat']['hand'])-1
        if (run,d['floor']) in [('C48LLXBGKXQ9',24),(RUN,35)]:
            assert len(after['agent_view']['combat']['draw']) == len(before['agent_view']['combat']['draw'])+3
            count = lambda s: sum(int(m.group(1)) if (m := re.search(r'\*(\d+) \[',c['line'])) else 1 for c in s['agent_view']['combat']['draw'])
            assert (count(before),count(after)) == ((18,21) if run=='C48LLXBGKXQ9' else (17,20))
            assert before['combat']['player']['energy']-after['combat']['player']['energy'] == 2
            assert any('METAMORPHOSIS' in c['card_ids'] for c in after['agent_view']['combat']['exhaust'])
        # The raw pile metadata lives in the projected agent view.
        generated.append(dict(run=run,floor=d['floor'],turn=d['turn'],ts=d['ts'],before=before,after=after))
assert len(generated)>=2
(O/'generated-attack-windows.json').write_text(json.dumps(generated,ensure_ascii=False,indent=2)+'\n')
(O/'mechanism-facts.json').write_text(json.dumps(mechanisms,ensure_ascii=False,indent=2)+'\n')
(O/'new-mechanism-windows.json').write_text(json.dumps(dict(cards=newcards,ends=ends),ensure_ascii=False,indent=2)+'\n')
other={}
for p in (ROOT/'.worktrees/exp/knowledge/characters/silent').glob('*.json'):
    if p.name=='experience.json':continue
    value=json.load(open(p));other[p.name]=dict(sha256=hashlib.sha256(p.read_bytes()).hexdigest(),meta=value.get('meta'),generated_from=value.get('generated_from'),note=value.get('note') or value.get('_about'))
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n')
print('仪式、敏捷、临时减力、毒雾、余像、能力加费及沙虫对照原帧断言通过；六牌全部支持局实打核对。')
print('机制支持/反例/进阶', {k:(len(v['support']),len(v['contradict']),v['asc']) for k,v in mechanisms.items()})
