import collections,datetime,hashlib,json,pathlib
p=pathlib.Path('learner/runs/20261008-231302-postmortem');run='Z91JN3S3PQX2'
d=json.loads((p/(run+'-subset.json')).read_text());f=json.loads((p/(run+'-facts.json')).read_text())
s={x['_line']:x for x in d['states']};dec={x['_line']:x for x in d['decisions']}
expected=[(2,56,70,55,70),(3,55,70,54,70),(8,40,70,37,71),(9,37,71,33,72),(12,54,72,55,73),(14,55,73,54,74),(15,54,74,53,75),(17,75,75,33,76),(19,67,76,68,77),(21,58,77,36,78),(28,77,78,58,79),(30,58,79,55,80),(33,79,80,0,80)]
actual=[(w['floor'],w['entry']['hp'],w['entry']['max_hp'],w['exit']['hp'],w['exit']['max_hp']) for w in f['combats']]
assert actual==expected,(actual,expected)
for floor,progress,hp in [(21,[24,10,0,18,38,2],[-4,0,-19,0,0,1]),(28,[34,13,28,26,70],[-4,-8,-3,0,-4]),(33,[33,17,8,17,14,7,16,9,26,26,32,62,29],[0,-4,0,0,-3,-16,-24,0,-4,-10,-1,0,-17])]:
 w=next(w for w in f['combats'] if w['floor']==floor);assert [t['net_progress'] for t in w['turns']]==progress;assert [t['hp_net'] for t in w['turns']]==hp
before=s[307493]['state'];after=s[307494]['state'];assert before['turn']==after['turn']==13
assert [before['run']['current_hp'],before['combat']['player']['block'],after['run']['current_hp'],after['combat']['player']['block']]==[17,8,0,8]
a=before['combat']['enemies'][0];b=after['combat']['enemies'][0]
assert [a['current_hp'],b['current_hp']]==[50,45]
assert a['intents'][0]['damage']==13 and a['intents'][0]['hits']==2
assert next(x['amount'] for x in a['powers'] if x['power_id']=='SANDPIT_POWER')==1
assert next(x['amount'] for x in a['powers'] if x['power_id']=='POISON_POWER')==5
assert all(x.get('reload') is None for x in d['sl']);assert len(d['sl'])==2
for line,expected_pairs in [(299919,{'plan1':(3,8),'plan2':(16,20)}),(299945,{'plan1':(1,0),'plan2':(10,14)})]:
 opts={k:json.loads(v) for k,v in dec[line]['questions']['plan']['criteria'].items()}
 assert 'HP guard:' in dec[line]['rationale']
 for k,v in expected_pairs.items():assert (opts[k]['hp_lost'],opts[k]['damage_dealt'])==v
 assert next(t['hp_net'] for w in f['combats'] if w['floor']==33 for t in w['turns'] if t['turn']==dec[line]['turn'])== -opts['plan1']['hp_lost']
jev=[x for x in d['decisions'] if x['decider']=='jev'];assert len(jev)==117
low=[x for x in jev if (x.get('confidence') if x.get('confidence') is not None else x.get('answers',{}).get('plan',{}).get('confidence',1))<.35]
assert len(low)==20,len(low)
plans=[x for x in jev if x['label'].startswith('combat/plan-choice')];counts=collections.Counter(x.get('rollout_best_chosen') for x in plans)
assert len(plans)==99 and counts[True]==97 and counts[False]==1 and counts[None]==1,counts
code=[x for x in d['decisions'] if x['decider']=='code' and x['label'].startswith('combat/') and x['label']!='combat/plan-continue'];assert len(code)==66
key=lambda x:(x['floor'],x.get('sl_attempt') or 0,x.get('turn'))
assert len(set(map(key,code)))==48
noend=[x for x in code if x.get('chosen',{}).get('action')!='end_turn'];assert (len(noend),len(set(map(key,noend))))==(27,25)
assert sum('HP guard:' in x.get('rationale','') for x in d['decisions'])==2
assert len(f['focus'])==0
use=[x for x in d['decisions'] if x.get('chosen',{}).get('action')=='use_potion'];assert len(use)==10
assert not any(x.get('chosen',{}).get('action')=='discard_potion' for x in d['decisions'])
assert sum(len(x['added']) for x in f['potions'] if not x['restart'])==10
assert [s[307441]['state']['combat']['player']['block'],s[307442]['state']['combat']['player']['block'],s[307442]['state']['combat']['enemies'][0]['intents'][0]['total_damage']]==[14,26,23]
assert next(x['amount'] for x in s[307480]['state']['combat']['enemies'][0]['powers'] if x['power_id']=='POISON_POWER')==6
for who,nums in [('jev',(477560,5527)),('codex',(4123946,8547))]:
 rows=[x for x in d['decisions'] if x['decider']==who];actuals=tuple(sum((x.get('usage')or{}).get(k,0)or 0 for x in rows) for k in ['input_tokens','output_tokens']);assert actuals==nums,actuals
parse=lambda x:datetime.datetime.fromisoformat(x.replace('Z','+00:00'))
assert round((parse(d['decisions'][-1]['ts'])-parse(d['decisions'][0]['ts'])).total_seconds(),3)==1531.064
assert round((parse(d['decisions'][-1]['ts'])-parse(d['states'][0]['ts'])).total_seconds(),3)==1567.260
text=(p/(run+'-final.md')).read_text().replace('（SANDPIT）','（SANDPIT_POWER）').replace('逃离（FRANTIC_ESCAPE）','狂乱逃离（FRANTIC_ESCAPE）')
assert text.count('\n- [')==4
(p/(run+'-final.md')).write_text(text)
result={'run':run,'status':'通过','resource_windows':len(expected),'jev':117,'low_confidence':20,'best_counts':{'true':97,'false':1,'null':1},'guards':2,'potion_use':10,'boss_turn':13,'entry_hp':79,'pre_end_hp':17,'block':8,'final_hp':0,'final_enemy_hp':45,'attack_budget':16,'attack_actually_resolved':'未记录','sha256':hashlib.sha256(text.encode()).hexdigest()}
(p/'Z-number-check.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False))
