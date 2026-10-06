import json,subprocess,pathlib
O=pathlib.Path(__file__).parent;ROOT=pathlib.Path('/home/dw/Projects/agent-sts2');CLI=['python3',str(ROOT/'learner/ledger.py')]
C=json.load(open(O/'changes.json'));B=json.load(open(O/'experience-before.json'));E=json.load(open(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json'));old={x['id']:x for x in B['entries']};by={x['id']:x for x in E['entries']}
L=json.loads(subprocess.check_output(CLI+['fold','--json']));L=list(L.values()) if isinstance(L,dict) else L;lb={x['id']:x for x in L}
pairs={'silent-footwork-block':['silent-0005'],'silent-strength-weak-observation':['silent-0006'],'silent-noxious-fumes-growth':['silent-0011'],'silent-piercing-wail-temporary-strength':['silent-0046'],'silent-giant-explosion-window':['silent-0017'],'silent-route-hp-observation':['silent-0019'],'silent-rest-buffer-observation':['silent-0020'],'silent-deck-burst-observation':['silent-0021','silent-0057'],'silent-toxic-paid-exhaust-end-turn-loss':['silent-0214','silent-0059']}
assert set(pairs)==set(C['added']+C['updated'])
commit=(O/'commit.txt').read_text().strip();title=(O/'changelog-title.txt').read_text().strip();updates={}
for eid,ids in pairs.items():
 e=by[eid];extra=[r for r in e['evidence'] if r not in old.get(eid,{}).get('evidence',[])]
 for lid in ids:
  assert lid in lb and lb[lid]['character']=='silent'
  u=updates.setdefault(lid,dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=[],commits=[commit],changelog=[title]),evidence=[]))
  u['where']['experience'].append(eid)
  seen={(x['run'],x.get('role','support')) for x in lb[lid]['evidence']}
  for run in extra:
   if lid=='silent-0057' and run!='TKXQ6L4N9A6U':continue
   if lid=='silent-0059' and run!='TKXQ6L4N9A6U':continue
   if (run,'support') in seen:continue
   if lid=='silent-0214':
    note='全静默历史原日志重新核对TOXIC：实际1能量付费离手、卡面持牌末回合5伤；该局支持付费/卡面子机制，不冒称每局都有先死顺序或受控整战。'
   else:note=f'本轮原始日志与复盘核对{eid}非药水证据，实际建立/结算与未来计划分账；缺受控整场者只写观察，不新增repeat或用药规则。'
   u['evidence'].append(dict(run=run,role='support',note=note));seen.add((run,'support'))
for u in updates.values():
 if not u['evidence']:del u['evidence']
lines=[updates[k] for k in sorted(updates)];(O/'ledger-updates.jsonl').write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in lines));out=[]
for x in lines:
 p=subprocess.run(CLI+['update'],input=json.dumps(x,ensure_ascii=False),text=True,capture_output=True);out.append(dict(id=x['id'],rc=p.returncode,stdout=p.stdout,stderr=p.stderr));(O/'ledger-results.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
 if p.returncode:raise RuntimeError(p.stderr)
check=subprocess.run(CLI+['check'],text=True,capture_output=True);(O/'ledger-check.log').write_text(check.stdout+check.stderr)
result=dict(added=[],proposed=sorted(updates),retired=[],check=check.returncode);(O/'ledger-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(result);assert check.returncode==0
