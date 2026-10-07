import collections,hashlib,json
from pathlib import Path
O=Path(__file__).parent;N='KFRDELW2TH2P';C=json.load(open(O/'changes.json'));A=json.load(open(O/'audit.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};F=json.load(open(O/N/'facts.json'));H=json.load(open(O/'historical-potions.json'))
mechanisms=[]
for c in C['entries']:
 e=c['after'];assert e['n_support']==len(set(e['evidence']));assert all(R[n]['character'].lower()=='silent' for n in e['evidence']+e.get('contradicting',[]))
 mechanisms.append(dict(id=e['id'],scope=e['scope'],support=e['n_support'],contradict=e['n_contradict'],evidence=e['evidence'],contradicting=e.get('contradicting',[]),asc=dict(sorted(collections.Counter(str(R[n]['ascension']) for n in e['evidence']).items(),key=lambda x:int(x[0])))))
(O/'mechanism-evidence.json').write_text(json.dumps(mechanisms,ensure_ascii=False,indent=2)+'\n')
history={}
for card,power in [('ACCELERANT','ACCELERANT_POWER'),('BURST','BURST_POWER'),('FOOTWORK','DEXTERITY_POWER')]:
 rows=[r for r in A['cards'] if r['card']==card]
 history[card]=dict(runs=len({r['run'] for r in rows}),casts=len(rows),deltas=dict(collections.Counter(r['after']['powers'].get(power,0)-r['before']['powers'].get(power,0) for r in rows)),cases=rows)
(O/'historical-power-deltas.json').write_text(json.dumps(history,ensure_ascii=False,indent=2)+'\n')
for potion,power,amount in [('DEXTERITY_POTION','DEXTERITY_POWER',2),('HEART_OF_IRON','PLATING_POWER',7)]:
 rows=[r for r in H if r['potion']==potion];assert all(r['after']['powers'].get(power,0)-r['before']['powers'].get(power,0)==amount and r['before']['block']==r['after']['block'] for r in rows)
assert all([e['hp'] for e in r['before']['enemies']]==[e['hp'] for e in r['after']['enemies']] for r in H if r['potion']=='POISON_POTION')
for r in H:
 if r['potion']!='POISON_POTION':continue
 for b,z in zip(r['before']['enemies'],r['after']['enemies']):
  if b['index']!=r['target']:continue
  delta=z['powers'].get('POISON_POWER',0)-b['powers'].get('POISON_POWER',0)
  skull=any(x['relic_id']=='SNECKO_SKULL' for x in r['before']['relics'])
  if delta==0:assert b['powers'].get('ARTIFACT_POWER')==1 and z['powers'].get('ARTIFACT_POWER',0)==0
  elif delta==7:assert skull
  else:assert delta==6 and not skull and not b['powers'].get('ARTIFACT_POWER',0)
next_fight=next(r for r in F if r['floor']==30)
assert next_fight['before']['powers'].get('DEXTERITY_POWER',0)==0

for att in range(1,7):
 last=next(r for r in F if r['floor']==33 and r['turn']==7 and r['attempt']==att and r['action']=='use_potion')
 assert last['before']['enemies'][0]['powers']['POISON_POWER']+6==last['after']['enemies'][0]['powers']['POISON_POWER']
 hand=[r for r in F if r['floor']==33 and r['turn']==7 and r['attempt']==att and r['action']=='play_card'];assert [r['card'] for r in hand]==['HAND_TRICK','DEFEND_SILENT','POISONED_STAB'];assert not any('BURST_POWER' in r['after']['powers'] for r in hand)
 assert any(c['id']=='BURST' and c['blocked']=='blocked_by_hook' for c in last['before']['hand'])
for att,block,loss,net in [(1,12,6,83),(3,6,12,93)]:
 rows=[r for r in F if r['floor']==33 and r['turn']==6 and r['attempt']==att];start=rows[0]['before'];end=next(r for r in rows if r['action']=='end_turn');assert start['hp']==15 and start['enemies'][0]['hp']==228 and start['enemies'][0]['powers']['POISON_POWER']==36 and start['powers']['PLATING_POWER']==3;assert end['before']['block']==block and start['hp']-end['after']['hp']==loss and 228-end['after']['enemies'][0]['hp']==net
last=next(r for r in F if r['floor']==33 and r['turn']==7 and r['attempt']==6 and r['action']=='end_turn');assert last['before']['hp']==9 and last['before']['block']==12 and last['before']['powers']['PLATING_POWER']==2 and last['after']['hp']==0 and last['after']['enemies'][0]['hp']==74 and last['before']['enemies'][0]['hp']-last['after']['enemies'][0]['hp']==85
transitions=[]
for run in next(m['evidence'] for m in mechanisms if m['id']=='silent-act-transition-missing-hp-heal'):
 S=[json.loads(s)['state'] for s in (O/run/'states.jsonl').open()]
 for before,after in zip(S,S[1:]):
  b,z=before['run'],after['run']
  if z['floor'] not in [18,34] or b['floor']!=z['floor']-1:continue
  assert b['max_hp']==z['max_hp'];gain=(b['max_hp']-b['current_hp'])*80//100;assert z['current_hp']-b['current_hp']==gain;transitions.append(dict(run=run,floor=z['floor'],before=b['current_hp'],after=z['current_hp'],gain=gain))
(O/'transition-heal-evidence.json').write_text(json.dumps(transitions,ensure_ascii=False,indent=2)+'\n')
other=[]
for p in sorted((O.parents[2]/'knowledge/characters/silent').glob('*.json')):
 if p.name=='experience.json':continue
 x=json.load(open(p));other.append(dict(file=str(p),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),metadata={k:v for k,v in x.items() if k in ['version','generated','generated_at','_about','_meta','cutoff']},keys=list(x)))
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n')
result=dict(checked='旧118局七数组/血档/节点后战/回血/SL一致；六试奇巧、同盘T6、末毒伤与三药全史逐动作通过',transitions=len(transitions),history={k:{a:b for a,b in v.items() if a!='cases'} for k,v in history.items()},other_files=len(other),budget=C['chars_after'])
(O/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(result)
