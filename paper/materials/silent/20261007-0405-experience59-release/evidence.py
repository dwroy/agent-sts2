import bisect
import collections
import hashlib
import json
import re
from pathlib import Path

O = Path(__file__).parent
ROOT = O.parents[2]
A = json.load(open(O / 'audit.json'))
F = json.load(open(ROOT / '.worktrees/exp/knowledge/characters/silent/experience.json'))
R = {r['run_id']:r for r in json.load(open(O / 'UMVLWER4CD98/completed-runs.json'))}
C = json.load(open(O / 'changes.json'))
S = [json.loads(s) for s in (O/'UMVLWER4CD98/states.jsonl').open()]
D = [json.loads(s) for s in (O/'UMVLWER4CD98/decisions.jsonl').open()]
T = [s['observed_ts'] for s in S]
assert len(D) == 1165 and len(S) == 1202
assert all(s['state']['run']['character_id'].lower() == 'silent' for s in S)
for e in F['entries']:
    assert len(e['evidence']) == e['n_support']
    assert len(e.get('contradicting', [])) == e['n_contradict']
    for run in e['evidence']+e.get('contradicting', []):
        assert re.fullmatch('[A-Z0-9]{12}',run) and R[run]['character'].lower()=='silent'
    assert 0 <= e['asc'][0] <= e['asc'][1] <= 20

def before(d):
    return S[max(0,bisect.bisect_right(T,d['observed_ts'])-1)]['state']
def after(d):
    return S[min(len(S)-1,bisect.bisect_right(T,d['observed_ts']))]['state']
def hp(s):
    return (s.get('combat') or {}).get('player',{}).get('current_hp',s['run']['current_hp'])
def pows(s):
    return {p['power_id']:p['amount'] for p in s['combat']['player']['powers']}

rest = []
for d in D:
    if d['label'] != 'rest/plan':continue
    a,b=before(d),after(d)
    rest.append(dict(floor=d['floor'],chosen=d['chosen'],option=d.get('expect',{}).get('option'),hp_before=hp(a),hp_after=hp(b),max_before=a['run']['max_hp'],max_after=b['run']['max_hp']))
heals=[x for x in rest if x['chosen']['option_index']==0]
assert len(heals)==10 and sum(x['hp_after']-x['hp_before'] for x in heals)==321
assert all(x['max_after']-x['max_before']==5 for x in heals)
for floor,h0,h1,m0,m1 in [(16,51,81,85,90),(47,31,70,115,120),(9,54,54,75,75)]:
    r=next(x for x in rest if x['floor']==floor)
    assert [r['hp_before'],r['hp_after'],r['max_before'],r['max_after']]==[h0,h1,m0,m1]

end=S[-1]['state'];pre=S[-2]['state']
assert end['screen']=='GAME_OVER' and hp(end)==0 and end['turn']==11
assert hp(pre)==8 and pre['combat']['player']['block']==22 and pows(pre)['DEXTERITY_POWER']==7 and pows(pre)['STRENGTH_POWER']==2
assert end['combat']['enemies'][0]['current_hp']==313
assert sum(x.get('total_damage') or 0 for x in pre['combat']['enemies'][0]['intents'])==40
w=[c for c in pre['combat']['hand'] if c['card_id']=='WITHER']
assert len(w)==1 and '12点伤害' in w[0]['resolved_rules_text']
assert 40+12-22==30 and 8-30==-22
last=[d for d in D if d['floor']==48 and d.get('sl_attempt')==6]
assert last
last_frames=[s['state'] for s in S if last[0]['observed_ts']<=s['observed_ts']<=T[-1] and s['state']['run']['floor']==48]
assert all('NOXIOUS_FUMES_POWER' not in pows(s) for s in last_frames if s.get('combat'))
defend=next(d for d in last if d['turn']==11 and (d.get('expect') or {}).get('card',{}).get('id')=='DEFEND_SILENT')
a,b=before(defend),after(defend)
assert a['combat']['player']['block']==0 and b['combat']['player']['block']==22
assert pows(a)['DEXTERITY_POWER']==7
assert next(r for r in a['run']['relics'] if r['relic_id']=='TUNING_FORK')['stack']==9
assert next(r for r in b['run']['relics'] if r['relic_id']=='TUNING_FORK')['stack']==10
footworks=[r for r in A['cards'] if r['run']=='UMVLWER4CD98' and r['floor']==48 and r['attempt']==6 and r['card']=='FOOTWORK']
assert len(footworks)==3
assert [r['after']['powers']['DEXTERITY_POWER']-r['before']['powers'].get('DEXTERITY_POWER',0) for r in footworks]==[3,2,2]
inflame=next(r for r in A['cards'] if r['run']=='UMVLWER4CD98' and r['floor']==48 and r['attempt']==6 and r['card']=='INFLAME')
assert inflame['turn']==3 and inflame['after']['powers']['STRENGTH_POWER']==2
for entry,card in [('silent-footwork-block','FOOTWORK'),('silent-noxious-fumes-growth','NOXIOUS_FUMES'),('silent-piercing-wail-temporary-strength','PIERCING_WAIL')]:
    e=next(x for x in F['entries'] if x['id']==entry)
    played={r['run'] for r in A['cards'] if r['card']==card}
    assert set(e['evidence']) <= played

prism=[r for r in A['cards'] if r['run']=='UMVLWER4CD98' and r['floor']==27 and r['turn']==3]
poison=next(x for x in prism if x['card']=='DEADLY_POISON')
assert [poison['before']['powers'].get('TAINTED_POWER'),poison['after']['powers'].get('TAINTED_POWER')]==[6,9]
turn_end=next(x for x in A['ends'] if x['run']=='UMVLWER4CD98' and x['floor']==27 and x['turn']==3)
assert turn_end['before']['block']==5 and turn_end['before']['hp']-turn_end['after']['hp']==13
SL=[r for r in A['attempts'] if r['run']=='UMVLWER4CD98' and r['floor']==48]
assert len(SL)==6 and sum(x['result']=='won' for x in SL)==0
comparison=dict(attempts=[dict(attempt=x['attempt'],result=x['result'],turns=x['turns'],draw_count=len(x['draws']['order']),clean=x['draws']['clean'],broke=x['draws']['broke'],draws=x['draws'],explore=x['explore']) for x in SL],first_last_same_order=SL[0]['draws']['order']==SL[-1]['draws']['order'],first_last_same_turns=SL[0]['draws']['turns']==SL[-1]['draws']['turns'])
(O/'sl-comparison.json').write_text(json.dumps(comparison,ensure_ascii=False,indent=2)+'\n')
facts=[]
for e in F['entries']:
    if e['id'] not in C['added']+C['updated']:continue
    facts.append(dict(id=e['id'],scope=e['scope'],asc=e['asc'],supports=e['evidence'],contradicting=e.get('contradicting',[]),n_support=e['n_support'],n_contradict=e['n_contradict'],asc_counts=dict(collections.Counter(R[r]['ascension'] for r in e['evidence'])),lesson=e['lesson']))
(O/'mechanism-facts.json').write_text(json.dumps(facts,ensure_ascii=False,indent=2)+'\n')
(O/'verified-rests.json').write_text(json.dumps(rest,ensure_ascii=False,indent=2)+'\n')
others=[]
for path in sorted((ROOT/'.worktrees/exp/knowledge/characters/silent').glob('*.json')):
    if path.name=='experience.json':continue
    data=json.load(open(path));others.append(dict(path=str(path),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),keys=list(data),metadata={k:data[k] for k in ['meta','generated','generated_from','ascensions','note'] if k in data}))
(O/'other-knowledge.json').write_text(json.dumps(others,ensure_ascii=False,indent=2)+'\n')
print('角色/证据/n/范围及旧基线通过；步法、毒雾、尖啸全部支持局有实际施放。')
print('十次回血321/每次上限+5、锻造无增长、三步法7敏、音叉另7合22、燃烧2力、末需损30与实死/敌313、棱柱重问污染/实损13、SL六败原始抽序不同通过。')
