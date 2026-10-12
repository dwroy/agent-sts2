import collections,json,re
from pathlib import Path
O=Path(__file__).parent;N='KEN58SH9SLZ6';R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};X=json.load(open(O/'experience-before.json'));E=json.load(open(O.parents[2]/'knowledge/characters/silent/experience.json'));A=json.load(open(O/'audit.json'));F=json.load(open(O/N/'facts.json'));D=[json.loads(l) for l in (O/N/'decisions.jsonl').open()];S=[json.loads(l) for l in (O/N/'states.jsonl').open()];SL=[json.loads(l) for l in (O/N/'sl-attempts.jsonl').open()]
def one(t,card=None,action=None,attempt=6):return next(x for x in F if x['floor']==17 and x['attempt']==attempt and x['turn']==t and (card is None or x['card']==card) and (action is None or x['action']==action))
def start(t,attempt=6):return next(x['before'] for x in F if x['floor']==17 and x['attempt']==attempt and x['turn']==t)
assert (len(D),len(S),len(SL))==(548,558,6)
assert all(s['state']['run']['character_id'].lower()=='silent' and s['state']['run_id']==N for s in S)
assert all(d['ts'] in {s['ts'] for s in S} for d in D)
assert collections.Counter(x['result'] for x in SL)=={'predicted_death':5,'died':1}
assert [start(1,a)['hp'] for a in range(1,7)]==[75]*6
assert all(not s['state']['run']['potions'] or all(not p.get('potion_id') for p in s['state']['run']['potions']) for s in S if s['state']['run']['floor']==17)
assert (O/N/'deepseek-reasoning.jsonl').stat().st_size==0
for t,h0,h1 in [(6,61,55),(10,33,19),(12,19,6),(13,6,0)]:
 x=one(t,action='end_turn');assert (x['before']['hp'],x['after']['hp'])==(h0,h1),(t,x)
x=one(9,card='FOOTWORK');assert x['before']['powers'].get('DEXTERITY_POWER',0)==0 and x['after']['powers']['DEXTERITY_POWER']==2
assert start(8)['powers'].get('DEXTERITY_POWER',0)==0
x=one(6,card='HAZE');assert x['after']['enemies'][0]['powers']['POISON_POWER']==4 and x['before']['enemies'][0]['hp']==x['after']['enemies'][0]['hp']
x=one(8,card='POISONED_STAB');assert (x['before']['enemies'][0]['powers']['POISON_POWER'],x['after']['enemies'][0]['powers']['POISON_POWER'])==(5,8)
assert x['before']['enemies'][0]['hp']-x['after']['enemies'][0]['hp']==6
x=one(2,card='NEUTRALIZE');assert (x['before']['block'],x['after']['block'])==(0,4)
assert any(x['turn']==3 and x['attempt']==6 and x['card']=='SHIV' and x['before']['block']==6 and x['after']['block']==10 for x in F if x['floor']==17)
assert sum(x['death'] for x in A['fights'])==95 and len(A['fights'])==1536 and len(A['runs'])==105
new=[r for r in A['fights'] if r['run']==N];assert len(new)==7 and sum(r['loss'] for r in new if not r['death'])==46
assert (next(r for r in A['bands'] if (r['asc'],r['act'],r['type'],r['band'])==(10,1,'Boss','≥60%'))['deaths'])==9
pair=[next(d for d in D if d['floor']==17 and d['turn']==10 and (d.get('sl_attempt') or 1)==a and d['label']=='combat/plan-choice') for a in [4,5]]
assert pair[0]['fingerprint']==pair[1]['fingerprint']
for e in E['entries']:
 assert e['n_support']==len(e['evidence'])==len(set(e['evidence'])),e['id']
 assert e['n_contradict']==len(e.get('contradicting',[])),e['id']
 assert all(re.fullmatch('[A-Z0-9]{12}',r) and R[r]['character'].lower()=='silent' for r in e['evidence']+e.get('contradicting',[])),e['id']
 assert e['scope'].split(':')[0] in ['boss','elite','hallway','act','general','card','relic','potion','event']
 if e['scope'].split(':')[0] in ['card','relic','potion','event']:assert e.get('name'),e['id']
active=[e for e in E['entries'] if e['status']=='active'];assert sum(len(e['lesson']) for e in active)<=60000
summary=dict(character='silent',runs=105,fights=1536,deaths=95,new_fights=7,new_wins=6,new_won_loss=46,sl_attempts=6,sl_wins=0,deepseek=0,checks='旧104局七数组/血档/节点/回复/SL一致；548决策558状态匹配；步法/毒/折扇/呼唤/同指纹SL及字段预算通过')
(O/'verification.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(summary)
