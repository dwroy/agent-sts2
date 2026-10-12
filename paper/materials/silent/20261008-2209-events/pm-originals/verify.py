import collections, hashlib, json, pathlib, re
p=pathlib.Path(__file__).resolve().parent

def rows(n):
 a=[]
 for line in (p/n).open():
  k,v=line.split(':',1);r=json.loads(v);r['_line']=int(k);a.append(r)
 return a
ss=rows('states-lines.jsonl');ds=rows('decisions-lines.jsonl');sl=rows('sl-lines.jsonl');bs=rows('brain-lines.jsonl');ta=json.loads((p/'turn-audit.json').read_text());rr=json.loads((p/'WZL2AMEY85S7-resources.json').read_text())
assert len(ss)==390 and len(ds)==381 and len(bs)==15 and len(sl)==6
expected=[(2,56,56),(3,56,55),(4,55,55),(5,55,45),(6,45,2),(13,56,33),(14,33,19)]
for c,(f,a,z) in zip(rr['combats'][:7],expected):
 assert c['floor']==f and c['entry']['hp']==a and c['exit']['hp']==z and c['entry_is_turn_one']
assert all(c['entry']['hp']==40 and not c['entry']['potions'] for c in rr['combats'][7:])
assert [x['turns'] for x in sl]==[8,8,7,8,8,8]
assert [x['end_hp'] for x in sl]==[3,8,2,5,3,0]
assert rr['combats'][-1]['exit']['hp']==0
final=[t for t in ta if t['sequence']==13]
assert [t['hp_start']-t['hp_end'] for t in final]==[0,20,0,8,4,0,0,8]
assert [t['enemy_start'][0]['current_hp']-t['enemy_next'][0]['current_hp'] for t in final]==[23,25,8,8,11,32,22,24]
assert final[-1]['enemy_next'][0]['current_hp']==109
assert final[-1]['player_last']['block']==8
assert sum(i['total_damage'] or 0 for i in final[-1]['enemy_last'][0]['intents'])==17
plan=[d for d in ds if d['label']=='combat/plan-choice'];assert len(plan)==45 and sum(x.get('rollout_best_chosen') is True for x in plan)==36
boss=[x for x in plan if x['floor']==17];assert len(boss)==25 and sum(x.get('rollout_best_chosen') is True for x in boss)==17
assert sum(d.get('confidence') is not None and d['confidence']<.35 for d in ds)==7
assert sum(any(json.loads(v).get('focus') for v in d['questions']['plan']['criteria'].values()) for d in plan)==9
assert not any('guard' in d.get('rationale','').lower() for d in ds)
assert sum((d.get('chosen') or {}).get('action')=='use_potion' for d in ds)==2
assert sum((d.get('chosen') or {}).get('action')=='discard_potion' for d in ds)==0
assert sum((d.get('usage') or {}).get('input_tokens',0) for d in ds if d['decider']=='jev')==279100
assert sum((d.get('usage') or {}).get('output_tokens',0) for d in ds if d['decider']=='jev')==2725
assert sum(b['usage']['inputTokens'] for b in bs)==1968362
assert sum(b['usage']['outputTokens'] for b in bs)==4241
assert sum(b['usage'].get('cacheHitTokens',0) for b in bs)==846336
assert sum(b['latency_ms'] for b in bs)==378957
for x,y in [(8,10)]:
 a=next(t for t in ta if t['sequence']==x and t['turn']==4);b=next(t for t in ta if t['sequence']==y and t['turn']==4)
 sa=next(s['state'] for s in ss if s['_line']==a['start']);sb=next(s['state'] for s in ss if s['_line']==b['start'])
 assert sa['combat']['hand']==sb['combat']['hand']
 assert a['enemy_start']==b['enemy_start']
 assert a['hp_start']-a['hp_end']==13 and b['hp_start']-b['hp_end']==18
 assert a['enemy_start'][0]['current_hp']-a['enemy_next'][0]['current_hp']==28
 assert b['enemy_start'][0]['current_hp']-b['enemy_next'][0]['current_hp']==34
print('本局入口资源、逐轮死亡与SL配对、Jev口径、药水和token断言全部通过。')
