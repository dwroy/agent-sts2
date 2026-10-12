import collections, hashlib, json, re
from pathlib import Path

O=Path(__file__).parent;N='NHA2KW0RB7VP';K=O.parents[2]/'knowledge'
A=json.load(open(O/'audit.json'));C=json.load(open(O/'changes.json'))
X=json.load(open(O/'experience-before.json'));Y=json.load(open(K/'characters/silent/experience.json'))
meta={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
assert len(meta)==110 and all(r['character'].lower()=='silent' for r in meta.values())
assert max(r['ended'] for r in meta.values())=='2026-10-07T15:19:58.532Z'
old={e['id']:e for e in X['entries']}; changed=[]
for e in Y['entries']:
 assert re.fullmatch(r'[a-z][\w:-]*',e['id']) and e['scope'].split(':')[0] in ['boss','elite','hallway','act','general','card','relic','potion','event']
 assert all(re.fullmatch('[A-Z0-9]{12}',r) and r in meta for r in e['evidence'])
 assert len(e['evidence'])==len(set(e['evidence']))==e['n_support']
 if e.get('contradicting') is not None:assert len(e['contradicting'])==e['n_contradict']
 assert 0<=e['asc'][0]<=e['asc'][1]<=20
 if e['scope'].split(':')[0] in ['card','relic','potion','event']:assert e.get('name')
 if old.get(e['id'])!=e: changed.append(e['id'])
assert set(changed)==set(C['added']+C['updated']) and len(changed)==14
assert sum(len(e['lesson']) for e in Y['entries'] if e['status']=='active')==47952
assert len(A['fights'])==1606 and sum(f['death'] for f in A['fights'])==100
assert all(x['identical'] for x in json.load(open(O/'baseline-check.json')).values())
for name,x in json.load(open(O/'other-knowledge.json')).items():
 assert hashlib.sha256((K/'characters/silent'/name).read_bytes()).hexdigest()==x['sha256']
for p in (O/'slice-knowledge-before/common').glob('*'):
 if p.is_file():assert p.read_bytes()==(K/'common'/p.name).read_bytes()
samples=json.load(open(O/'sample-manifest.json'))
assert len(samples)==12 and all(s['selected']==s['unique']==20 for s in samples)
assert {s['asc'] for s in samples}=={9,10}
assert not json.load(open(O/'lamp-history.json'))['unresolved']

S=[json.loads(l) for l in (O/N/'states.jsonl').open()];D=[json.loads(l) for l in (O/N/'decisions.jsonl').open()]
assert len(S)==602 and len(D)==584
assert all(s['state']['run']['character_id'].lower()=='silent' and s['state']['run_id']==N for s in S)
SM={s['ts']:s['state'] for s in S};assert all(d['ts'] in SM for d in D)
F=[r for r in A['cards'] if r['run']==N]
step=next(r for r in F if r['floor']==19 and r['card']=='FOOTWORK');defend=next(r for r in F if r['floor']==19 and r['card']=='DEFEND_SILENT')
assert step['after']['powers']['DEXTERITY_POWER']-step['before']['powers'].get('DEXTERITY_POWER',0)==2
assert defend['after']['block']-defend['before']['block']==7
late=next(r for r in F if r['floor']==30 and r['card']=='FOOTWORK');assert late['before']['block']==late['after']['block']==8
fume=next(r for r in F if r['floor']==17 and r['card']=='NOXIOUS_FUMES');assert fume['before']['enemies'][0]['powers']['POISON_POWER']==fume['after']['enemies'][0]['powers']['POISON_POWER']==18
t6=next(d for d in D if d['floor']==17 and d['turn']==6 and d['screen']=='COMBAT');assert SM[t6['ts']]['combat']['enemies'][0]['powers'][0]['amount']==19
blurs=[r for r in F if r['floor']==33 and r['card']=='BLUR'];assert len(blurs)==6 and all(r['after']['block']-r['before']['block']==6 for r in blurs)
mal=[r for r in F if r['floor']==33 and r['card']=='MALAISE'];assert len(mal)==6 and all(r['before']['energy']==1 and r['after']['enemies'][0]['powers']['STRENGTH_POWER']==-2 and r['after']['enemies'][0]['powers']['WEAK_POWER']==2 for r in mal)
first={}
for d in D:
 if d.get('chosen') and d['screen']=='COMBAT' and d['floor']>=19:
  first.setdefault((d['floor'],d.get('sl_attempt') or 1,d['turn']),SM[d['ts']]['combat']['player']['energy'])
triples=[dict(floor=k[0],attempt=k[1],energy=[first.get((*k,t)) for t in [1,2,3]]) for k in sorted({k[:2] for k in first})]
assert len(triples)==11 and all(x['energy']==[3,3,4] for x in triples)
last=S[-1]['state'];assert last['screen']=='GAME_OVER' and last['run']['current_hp']==0 and last['turn']==4
assert [(e['enemy_id'],e['current_hp']) for e in last['combat']['enemies']]==[('CRUSHER',170),('ROCKET',147)]
last_action=next(d for d in reversed(D) if d['chosen']['action']=='end_turn')
b=SM[last_action['ts']];assert b['run']['current_hp']==16 and b['combat']['player']['block']==6
assert sum(i.get('total_damage') or 0 for e in b['combat']['enemies'] for i in e['intents'])==38
assert len([d for d in D if d['chosen']['action']=='use_potion'])==7
rests=[r for r in A['rests'] if r['run']==N];heals=[r for r in rests if r['after']>r['before']];assert len(heals)==5 and sum(r['after']-r['before'] for r in heals)==120
SL=[json.loads(l) for l in (O/N/'sl-attempts.jsonl').open()];assert [x['result'] for x in SL if x['floor']==33]==['predicted_death']*5+['died']
assert all(x['reload']['ok'] for x in SL if x['floor']==33 and x['attempt']<6)
result=dict(character='silent',completed_runs=110,states=602,decisions=584,fights=1606,deaths=100,old_baseline='七数组/血档/转移/实际回血/SL逐行一致',energy_windows=triples,active=C['after']['active'],chars=C['after']['chars'],fixed_slice_states=240,other_knowledge='八文件哈希及common逐字节保持',verification='通过')
(O/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print({k:v for k,v in result.items() if k!='energy_windows'})
