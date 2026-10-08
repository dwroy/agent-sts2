import collections,hashlib,json,re,subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2/.worktrees/exp');A=json.load(open(O/'audit.json'));C=json.load(open(O/'changes.json'))['entries'];R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};E=json.load(open(ROOT/'knowledge/characters/silent/experience.json'));before=json.load(open(O/'experience-before.json'));EM={e['id']:e for e in E['entries']};old={e['id']:e for e in before['entries']};cm={c['id']:c for c in C}
assert len(R)==153 and all(r['character'].lower()=='silent' for r in R.values())
assert len(C)==19 and sum(c['before'] is None for c in C)==1
for e in E['entries']:
 assert (e['id'] in cm and cm[e['id']]['after']==e) or old[e['id']]==e
 assert len(e['evidence'])==e['n_support']==len(set(e['evidence']))
 assert len(e.get('contradicting',[]))==e['n_contradict']
 assert all(re.fullmatch('[A-Z0-9]{12}',r) and r in R for r in e['evidence']+e.get('contradicting',[]))
 assert e['scope'].split(':')[0] in ['boss','elite','hallway','act','general','card','relic','potion','event']
 if e['scope'].split(':')[0] in ['card','relic','potion','event']:assert e.get('name')
 active=[e for e in E['entries'] if e['status']=='active']
assert len(active)==191 and sum(len(e['lesson']) for e in active)<55000
triggers=[]
for card,power in [('FOOTWORK','DEXTERITY_POWER'),('NOXIOUS_FUMES','NOXIOUS_FUMES_POWER'),('SHADOWMELD','SHADOWMELD_POWER'),('ACCELERANT','ACCELERANT_POWER')]:
 xs=[x for x in A['cards'] if x['card']==card]
 dist=collections.Counter(x['after']['powers'].get(power,0)-x['before']['powers'].get(power,0) for x in xs)
 triggers.append(dict(card=card,actions=len(xs),runs=len({x['run'] for x in xs}),net_delta=dict(dist),limits='动作总数/净差集合不等独立支持局或全模板机制；柔嫩/重放/结束另分源'))
 for x in xs:
  delta=x['after']['powers'].get(power,0)-x['before']['powers'].get(power,0)
  if card=='FOOTWORK' and delta==1:assert x['before']['powers'].get('TENDER_POWER')==1
xs=[x for x in A['potions'] if (x.get('potion') or {}).get('id')=='DEXTERITY_POTION']
assert all(x['after']['powers'].get('DEXTERITY_POWER',0)-x['before']['powers'].get('DEXTERITY_POWER',0)==2 and x['before']['block']==x['after']['block'] for x in xs)
triggers.append(dict(potion='DEXTERITY_POTION',actions=len(xs),runs=len({x['run'] for x in xs}),all_add_two=True,old_block_unchanged=True))
rocks=json.load(open(O/'rock-history.json'))
assert len(rocks)==5 and sum(len(x['used']) for x in rocks)==50
assert sum(len({g['floor'] for g in x['generated']}) for x in rocks)==40
for x in rocks:
 assert x['generated'] and any(p['hp_after'] is not None and p['hp_before']-p['hp_after']==15 and p['block_before']==p['block_after']==0 for p in x['used'])
 assert all(p['player_before']==p['player_after'] and p['has_to'] for p in x['used'])
 for g in x['generated']:
  for slot in g['slot']:
   old_p=next(p for p in g['before_potions'] if p['index']==slot)
   assert not old_p['occupied']
other=[]
for p in (ROOT/'knowledge/characters/silent').iterdir():
 if p.is_file() and p.name!='experience.json':
  data=json.load(open(p)) if p.suffix=='.json' else None
  other.append(dict(file=str(p.relative_to(ROOT)),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),fields=list(data)[:12] if isinstance(data,dict) else [],classification='现有生成/模型/结果数据，按自身切点和首试/重试/校准口径；无独立手写攻略，模型预估不当已执行事实'))
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n')
(O/'historical-trigger-checks.json').write_text(json.dumps(triggers,ensure_ascii=False,indent=2)+'\n')
(O/'final-verification.json').write_text(json.dumps(dict(entries=len(C),unmodified_equivalent=True,active=len(active),chars=sum(len(e['lesson']) for e in active),proposals=json.load(open(O/'proposal-ids.json')),rock_new_rooms=40,rock_uses=50,old_baseline=json.load(open(O/'baseline-check.json'))),ensure_ascii=False,indent=2)+'\n')
print('经验19变更/其余等价、证据角色/n/name/scope、历史触发与50投石/40新房、其余8知识通过')
print(json.dumps(triggers,ensure_ascii=False))
