import collections,json
from pathlib import Path
O=Path(__file__).parent;X=json.load(open(O/'experience-before.json'));Y=json.load(open('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};C=json.load(open(O/'changes.json'));result={}
assert len({e['id'] for e in Y['entries']})==len(Y['entries'])
for e in Y['entries']:
 assert len(set(e['evidence']))==e['n_support']==len(e['evidence'])
 assert len(set(e.get('contradicting',[])))==e['n_contradict']
 assert not set(e['evidence'])&set(e.get('contradicting',[]))
 assert all(R[n]['character'].lower()=='silent' and len(n)==12 for n in e['evidence']+e.get('contradicting',[]))
 if e['scope'].split(':')[0] in ['card','relic','potion','event']:assert e.get('name')
active=[e for e in Y['entries'] if e['status']=='active'];assert sum(len(e['lesson']) for e in active)<=60000
CH=json.load(open(O/'cunning-history.json'));assert len(CH['cases'])==42 and len(CH['support'])==9 and not CH['unexplained']
for r in CH['cases']:
 assert r['added']==min(3,10-r['before'])
 assert not any(p.get('potion_id')=='CUNNING_POTION' and p['index']==r['slot'] for p in r['potions_after'])
 if r['added']:assert all(r['upgrades'][-r['added']:]) and set(r['base_values'][-r['added']:])=={6}
 else:assert r['hp_before']==r['hp_after'] and r['energy_before']==r['energy_after']
result['cunning']=dict(runs=9,drinks=42,counts=dict(collections.Counter(str((r['before'],r['added'])) for r in CH['cases'])),capacity_runs=['WQZVENQ7DTRP'])
for n in ['TXZ6RVMQA09D','WQZVENQ7DTRP']:
 ss=[json.loads(l) for l in (O/n/'states.jsonl').open()];sm={x['ts']:x['state'] for x in ss};dd=[json.loads(l) for l in (O/n/'decisions.jsonl').open()];ff=json.load(open(O/n/'facts.json'))
 assert all(d['ts'] in sm for d in dd)
 if n.startswith('TXZ'):
  transitions=[]
  for floor,expected in [(43,[70,66]),(45,[52,48]),(46,[62,58]),(48,[60,56]),(49,[4,0])]:
   raw=[x['state'] for x in ss if x['state']['run']['floor']==floor];a=next(s for s in raw if s['screen']=='COMBAT');j=raw.index(a);b=raw[j+1];assert [a['run']['current_hp'],b['run']['current_hp']]==expected
   assert not any(r['relic_id']=='BLOOD_VIAL' for r in a['run']['relics']);transitions.append(dict(floor=floor,hp=expected,readiness=a['combat']['action_readiness']))
  assert not any(d['floor']==49 and d['screen']=='COMBAT' for d in dd)
  assert ss[-1]['state']['run']['current_hp']==0 and ss[-1]['state']['combat']['enemies'][0]['current_hp']==111
  fumes=next(f for f in ff if f['floor']==48 and f['attempt']==3 and f['turn']==5 and f['card']=='NOXIOUS_FUMES');assert fumes['after']['powers']['NOXIOUS_FUMES_POWER']==5
  acc=next(f for f in ff if f['floor']==48 and f['attempt']==3 and f['turn']==8 and f['card']=='ACCELERANT');assert acc['after']['powers']['ACCELERANT_POWER']==2 and acc['after']['enemies'][0]['powers']['POISON_POWER']==39
  final=next(f for f in ff if f['floor']==48 and f['attempt']==3 and f['turn']==10 and f['card']=='DEFEND_SILENT');assert [final['before']['block'],final['after']['block']]==[7,13]
  result['opening']=transitions
 else:
  ds=[next(d for d in dd if d['floor']==33 and d['turn']==9 and d.get('sl_attempt')==att and d['label'].startswith('combat/plan-choice')) for att in [2,3]];assert ds[0]['fingerprint']==ds[1]['fingerprint'];assert ds[1].get('sl_explore')
  next_ds=[next(d for d in dd if d['floor']==33 and d['turn']==10 and d.get('sl_attempt')==att) for att in [2,3]]
  losses=[]
  for d,z in zip(ds,next_ds):
   b,a=sm[d['ts']],sm[z['ts']];losses.append(dict(loss=b['run']['current_hp']-a['run']['current_hp'],damage=b['combat']['enemies'][0]['current_hp']-a['combat']['enemies'][0]['current_hp']))
  assert losses==[dict(loss=13,damage=24),dict(loss=22,damage=39)];result['sl_same_fingerprint']=losses
  footsteps=[f for f in ff if f['floor']==33 and f['attempt']==6 and f['turn']==1 and f['card']=='FOOTWORK'];assert [f['after']['powers']['DEXTERITY_POWER'] for f in footsteps]==[2,4]
  last=ss[-2]['state'];end=ss[-1]['state'];assert last['run']['current_hp']==9 and last['combat']['player']['block']==9 and end['run']['current_hp']==0
  assert last['combat']['enemies'][0]['current_hp']==81 and end['combat']['enemies'][0]['current_hp']==56;result['death_order']='沙坑/攻击内部先致死未记录，条件攻击需损18与实际9净损分开'
result['json_budget_roles']='通过';(O/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print('角色/证据/容量/升级基础/五入口/同指纹血价/能力/死亡勘误核验通过')
