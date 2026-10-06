import json, subprocess, collections
from pathlib import Path
O=Path(__file__).parent
CLI=['python3','/home/dw/Projects/agent-sts2/learner/ledger.py']
C=json.load(open(O/'changes.json'));E=json.load(open('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json'))
B=json.load(open(O/'experience-before.json'));old={x['id']:x for x in B['entries']};by={x['id']:x for x in E['entries']}
commit=(O/'commit.txt').read_text().strip();title=(O/'changelog-title.txt').read_text().strip()
L=json.loads(subprocess.check_output(CLI+['fold','--json']))
if isinstance(L,dict):L=list(L.values())
lb={x['id']:x for x in L};pairs={
'silent-footwork-block':['silent-0005'],
'silent-strength-weak-observation':['silent-0006'],
'silent-expose-vulnerable':['silent-0073','silent-0208'],
'silent-maul-shared-growth':['silent-0058'],
'silent-rolling-boulder-start-growth':['silent-0093','silent-0094'],
'silent-burst-next-skills-replay':['silent-0115'],
'silent-afterimage-per-card-block':['silent-0023'],
'silent-piercing-wail-temporary-strength':['silent-0046'],
'silent-beating-remnant-loss-cap':['silent-0031'],
'silent-wither-end-turn-loss':['silent-0024'],
'silent-aeonglass-artifact-growth-sl':['silent-0025','silent-0079'],
'silent-insatiable-dual-clock':['silent-0018'],
'silent-construct-artifact-growth':['silent-0025'],
'silent-deadly-poison-application':['silent-0007'],
'silent-bouncing-flask-poison':['silent-0007'],
'silent-accelerant-triggers':['silent-0027'],
'silent-route-hp-observation':['silent-0019'],
'silent-rest-buffer-observation':['silent-0020'],
'silent-deck-burst-observation':['silent-0021'],
'silent-gardener-skittish-shield':['silent-0209','silent-0211'],
'silent-panic-button-card-block-lock':['silent-0210','silent-0212']}
assert set(pairs)==set(C['added']+C['updated'])
updates={}
G=json.load(open(O/'gardener-actions.json'))
for eid,ids in pairs.items():
    e=by[eid]
    extra=[r for r in e['evidence'] if r not in old.get(eid,{}).get('evidence',[])]
    for lid in ids:
        u=updates.setdefault(lid,dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=[],commits=[commit],changelog=[title]),evidence=[]))
        u['where']['experience'].append(eid)
        seen={(x['run'],x.get('role','support')) for x in lb[lid]['evidence']}|{(x['run'],x.get('role','support')) for x in u['evidence']}
        for r in extra:
            if lid=='silent-0209' and r!='WYB0NCD6W83J':continue
            if (r,'support') in seen:continue
            if lid=='silent-0211':
                x=next(x for x in G if x['run']==r)
                u['evidence'].append(dict(run=r,floor=x['floor'],turn=x['turn'],role='support',note='全历史原始分帧核对：非致死命中后增加现场胆小层数的挡，盾与毒结算/实际退场分别核；无固定目标序因果。'))
            else:u['evidence'].append(dict(run=r,role='support',note=f'本次原始日志与复盘核对，支持{eid}的非药水部分；实际建立/结算及SL血价分账，未执行线不当整战因果。'))
u=updates['silent-0211'];u.update(first_run='T082DRCUHRRD',asc=0,prior_note='全历史22局加挡证据回查，最早T082 A0 F8 T1刺击31→25/挡0→6，比原回溯R0更早；登记前已有实际有效施毒/攻击与胜局，prior=yes保留，不推模型口头理解。',note='经验增量发现更早首证，CLI追加更正first_run；原R0首证/先验/历史与证据不改旧行。')
lines=[updates[k] for k in sorted(updates)]
for x in lines:
    if not x['evidence']:del x['evidence']
(O/'ledger-updates.jsonl').write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in lines))
out=[]
for x in lines:
    p=subprocess.run(CLI+['update'],input=json.dumps(x,ensure_ascii=False),text=True,capture_output=True)
    out.append(dict(id=x['id'],rc=p.returncode,stdout=p.stdout,stderr=p.stderr))
    (O/'ledger-results.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
    if p.returncode:raise RuntimeError(p.stderr)
check=subprocess.run(CLI+['check'],text=True,capture_output=True)
(O/'ledger-check.log').write_text(check.stdout+check.stderr)
result=dict(added=[],proposed=sorted(updates),retired=[],check=check.returncode)
(O/'ledger-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(result)
assert check.returncode==0
