import json,pathlib,subprocess
O=pathlib.Path(__file__).parent;ROOT=pathlib.Path('/home/dw/Projects/agent-sts2');CLI=['python3',str(ROOT/'learner/ledger.py')]
C=json.load(open(O/'changes.json'));E=json.load(open(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json'));by={e['id']:e for e in E['entries']};B=json.load(open(O/'experience-before.json'));old={e['id']:e for e in B['entries']}
L=json.loads(subprocess.check_output(CLI+['find','--character','silent','--json']));lb={x['id']:x for x in L}
pairs={'silent-snakebite-retained-poison':['silent-0220'],'silent-strength-weak-observation':['silent-0006','silent-0012'],'silent-piercing-wail-temporary-strength':['silent-0046'],'silent-lagavulin-siphon-poison-sl':['silent-0030','silent-0007'],'silent-route-hp-observation':['silent-0019'],'silent-rest-buffer-observation':['silent-0020'],'silent-deck-burst-observation':['silent-0021']}
assert set(pairs)==set(C['added']+C['updated'])
commit=(O/'commit.txt').read_text().strip();title=(O/'changelog-title.txt').read_text().strip();updates={}
for eid,ids in pairs.items():
 for lid in ids:
  assert lb[lid]['character']=='silent' and lb[lid]['kind']!='bug-infra'
  u=updates.setdefault(lid,dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=[],commits=[commit],changelog=[title]),evidence=[]))
  u['where']['experience'].append(eid);seen={(x['run'],x.get('role','support')) for x in lb[lid]['evidence']}
  for run in by[eid]['evidence']:
   if run in old.get(eid,{}).get('evidence',[]) or (run,'support') in seen:continue
   u['evidence'].append(dict(run=run,role='support',note=f'第67次增量：静默原日志核{eid}非药水证据，实际施放/结算与计划、毒层、SL尝试分别计；支持机制或观察，不认定单卡整战胜因。'));seen.add((run,'support'))
updates['silent-0220']['claim']='蛇咬保留，普通/升级实加7/10毒，施放不即时扣本体血；普通8局、升级2局共9局有重叠，玩家负力量不減施毒。普通实见2费，KAY早期0费来源未核不外推；毒按实际层数结算后减1、未结算毒不预支，族母六次零赢不证明早打必胜。'
for u in updates.values():
 if not u['evidence']:del u['evidence']
lines=[updates[k] for k in sorted(updates)];(O/'ledger-updates.jsonl').write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in lines));results=[]
for u in lines:
 p=subprocess.run(CLI+['update'],input=json.dumps(u,ensure_ascii=False),text=True,capture_output=True);results.append(dict(id=u['id'],rc=p.returncode,stdout=p.stdout,stderr=p.stderr));(O/'ledger-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n');assert p.returncode==0,p.stderr
p=subprocess.run(CLI+['check'],text=True,capture_output=True);(O/'ledger-check.log').write_text(p.stdout+p.stderr)
r=dict(added=[],proposed=sorted(updates),retired=[],check=p.returncode);(O/'ledger-result.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');assert p.returncode==0;print(r)
