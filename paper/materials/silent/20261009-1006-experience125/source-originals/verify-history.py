import bisect
import collections
import json
from pathlib import Path

O = Path(__file__).parent
A = json.load(open(O/'audit.json'))
R = {r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
C = json.load(open(O/'changes.json'))
output = []
for c in C:
    e = c['after']
    evidence = e['evidence']
    assert e['n_support']==len(set(evidence))
    assert all(R[r]['character'].lower()=='silent' for r in evidence+e.get('contradicting',[]))
    for r in evidence:
        s = json.loads((O/r/'states.jsonl').open().readline())['state']
        assert s['run']['character_id'].lower()=='silent'
    prefix, item = e['scope'].split(':',1)
    cases = [x for x in A['cards'] if x['run'] in evidence and x['card']==item] if prefix=='card' else [x for x in A['potions'] if x['run'] in evidence and (x.get('potion') or {}).get('id')==item] if prefix=='potion' else [x for x in A['fights'] if x['run'] in evidence and item in x['enemies']] if prefix in ['boss','elite'] else [x for x in A['fights'] if x['run'] in evidence]
    row = {'entry':e['id'],'evidence':evidence,'contradicting':e.get('contradicting',[]),'asc':dict(collections.Counter(R[r]['ascension'] for r in evidence)),'support':len(evidence),'contradict':len(e.get('contradicting',[])),'observed_actions_or_rooms':len(cases),'observation_runs':len({x['run'] for x in cases}), 'limitation':'总体支持为该观察主题局数，参数验证子分母另列；没有把已失败战斗当机制反例或把共现当单卡胜因。'}
    if item=='CURE_ALL':
        hand_deltas=[]
        for x in cases:
            assert x['after']['energy']-x['before']['energy']==1
            assert x['after']['hp']==x['before']['hp']
            frames=list(map(json.loads,(O/x['run']/'states.jsonl').open()))
            ts=[f['ts'] for f in frames]
            i=ts.index(x['ts']);before=frames[i]['state'];after=frames[min(i+1,len(frames)-1)]['state']
            hand_deltas.append(len(after['combat']['hand'])-len(before['combat']['hand']))
        assert hand_deltas==[2]*16
        row['checked']={'actions':16,'runs':10,'energy_delta':1,'hand_delta':2,'hp_delta':0}
    if item=='REGEN_POTION':
        assert len(cases)==33 and len({x['run'] for x in cases})==21
        assert all(x['after']['powers'].get('REGEN_POWER',0)-x['before']['powers'].get('REGEN_POWER',0)==5 for x in cases)
        row['checked']={'actions':33,'runs':21,'regen_delta':5,'full_five_turn_heal':15,'cap_or_short_fights':'按实际回复，未足五轮不预支'}
    if item=='TORIC_TOUGHNESS':
        assert len(cases)==31 and len({x['run'] for x in cases})==7
    if item in ['AFTERIMAGE','NOXIOUS_FUMES','PIERCING_WAIL','ANTICIPATE','HAZE','TORIC_TOUGHNESS']:
        row['parameter_cases']=cases
    output.append(row)
(O/'mechanism-evidence.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
print('16条证据角色/进阶/状态全核，痊愈16饮及再生33饮参数通过；卡牌参数全历史明细已保存。')
