import json,subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');CLI=['python3',str(ROOT/'learner/ledger.py')];C=json.load(open(O/'changes.json'));E=json.load(open(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json'));by={e['id']:e for e in E['entries']};B=json.load(open(O/'experience-before.json'));old={e['id']:e for e in B['entries']};L=json.loads(subprocess.check_output(CLI+['find','--character','silent','--json']));lb={x['id']:x for x in L}
pairs={'silent-scroll-paper-cuts-unblocked':['silent-0221'],'silent-strength-weak-observation':['silent-0006'],'silent-noxious-fumes-growth':['silent-0011','silent-0007'],'silent-accelerant-triggers':['silent-0027'],'silent-afterimage-per-card-block':['silent-0023'],'silent-anticipate-temporary-dexterity':['silent-0080'],'silent-piercing-wail-temporary-strength':['silent-0046'],'silent-route-hp-observation':['silent-0019'],'silent-rest-buffer-observation':['silent-0020'],'silent-deck-burst-observation':['silent-0021']}
assert set(pairs)==set(C['added']+C['updated']);commit=(O/'commit.txt').read_text().strip();title=(O/'changelog-title.txt').read_text().strip();updates={}
for eid,ids in pairs.items():
 for lid in ids:
  assert lb[lid]['character']=='silent' and lb[lid]['kind']!='bug-infra'
  u=updates.setdefault(lid,dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=[],commits=[commit],changelog=[title]),evidence=[]));u['where']['experience'].append(eid);seen={(x['run'],x.get('role','support')) for x in lb[lid]['evidence']}
  for run in by[eid]['evidence']:
   if run in old.get(eid,{}).get('evidence',[]) or (run,'support') in seen:continue
   u['evidence'].append(dict(run=run,role='support',note=f'第68次增量：静默原日志核{eid}非药水证据，建立/结算/未来回血分账，不认定单卡整战胜因。'));seen.add((run,'support'))
u=updates['silent-0221'];u.update(first_run='K3676LU8B0UH',asc=1,prior_note='全历史静默原始帧重核：A1 K367 F35已见纸伤2、14挡对10+5×2后上限77→73。更早静默局无该增益遭遇，prior=unknown保留；原A4首证判断追加更正，旧行留存。',note='首证由复盘初登记9YBK/A4更正到原日志最早K367/A1，既有claim/prior/支持和历史不删。只纳三局明确案例，其余历史遭遇和上限变化列核验附件。')
for u in updates.values():
 if (O/'initial-commit.txt').exists():u['note']=u.get('note','')+' 初稿9fad69d7及其proposed原行保留；定稿补回触媒TU3旧局号，新where给最终提交及唯一第68节，旧草稿标题为初稿引用。'
 if not u['evidence']:del u['evidence']
lines=[updates[k] for k in sorted(updates)];(O/'ledger-updates.jsonl').write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in lines));results=[]
for u in lines:
 p=subprocess.run(CLI+['update'],input=json.dumps(u,ensure_ascii=False),text=True,capture_output=True);results.append(dict(id=u['id'],rc=p.returncode,stdout=p.stdout,stderr=p.stderr));(O/'ledger-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n');assert p.returncode==0,p.stderr
p=subprocess.run(CLI+['check'],text=True,capture_output=True);(O/'ledger-check.log').write_text(p.stdout+p.stderr);r=dict(added=[],proposed=sorted(updates),retired=[],check=p.returncode);(O/'ledger-result.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');assert p.returncode==0;print(r)
