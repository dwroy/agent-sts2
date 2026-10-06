import json, subprocess
from pathlib import Path

O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2')
commit=(O/'commit.txt').read_text().strip()
title=f'2026-10-07 静默猎手 第六十二次增量：1 局 A10（version 2026-10-07.8，分支 exp-silent，{commit[:8]}）'
(O/'changelog-title.txt').write_text(title+'\n')
C=json.load(open(O/'changes.json'));E={e['id']:e for e in json.load(open(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json'))['entries']}
fold=subprocess.check_output(['python3',str(ROOT/'learner/ledger.py'),'fold','--character','silent','--json'],text=True)
L={r['id']:r for r in json.loads(fold)}
links={
'silent-tunneler-burrow-block-stun':['silent-0207'],
'silent-footwork-block':['silent-0005'],
'silent-strength-weak-observation':['silent-0006'],
'silent-prowess-strength-dexterity':['silent-0036'],
'silent-piercing-wail-temporary-strength':['silent-0046'],
'silent-malaise-x-debuff':['silent-0053'],
'silent-ceremonial-beast-threshold-growth-sl':['silent-0133'],
'silent-eternal-feather-rest-arrival-heal':['silent-0142'],
'silent-infested-prism-tainted-skill-cost':['silent-0167','silent-0168'],
'silent-deck-burst-observation':['silent-0021','silent-0057','silent-0125'],
'silent-route-hp-observation':['silent-0019'],
'silent-rest-buffer-observation':['silent-0020'],
}
assert set(links)==set(C['added']+C['updated'])
updates=[]
for entry,ids in links.items():
    for id in ids:
        seen={r['run'] for r in L[id]['evidence'] if r.get('role','support')=='support'}
        row=dict(id=id,by='learner:experience-update',status='proposed',where=dict(experience=[entry],commits=[commit],changelog=[title]),note='静默第62节经验2026-10-07.8：QNTW139MGECA A10及本角色历史，污染技能血价/力敏与能力实际支付、临时减力与阶段/成长、羽毛与休息、七局埋地清盾局部实证分别核，仅非药水支持。首证/先验/旧版本和repeat历史保留；0207首证按全历史日志更正，未选线整战未知，无确认老错repeat。只登记proposed，交运维核实际合入后登记shipped。')
        wanted=E[entry]['evidence'] if id=='silent-0207' else ['QNTW139MGECA']
        missing=[r for r in wanted if r not in seen]
        if missing:row['evidence']=[dict(run=r,role='support',note='第62节本角色原始状态/决策核验；埋地七次触发及其余具体公式/数据见经验、tunneler-facts.json和机制表。') for r in missing]
        if id=='silent-0207':
            row.update(first_run='LRN0HPZ0FZS1',asc=0,claim='静默七局已观察地道虫埋地BURROWED_POWER：格挡归零后，即使本体仍存活甚至未掉血，埋地消失、BELOW_MOVE转为眩晕，取消当前攻击。最早LRN0HPZ0FZS1 A0 F19 T3敌31血7挡→29血0挡、17攻击取消；A2一局、A9两局、A10三局同类实证。复盘只按rationale中文筛13局漏4个更早支持，本次全76局按enemy_id扫描补齐，不扩充固定选牌或击杀优先级。',prior_note='全76局原始状态按enemy_id=TUNNELER复查，最早LRN0HPZ0FZS1/A0在任何本项登记前已经清盾并取消17攻击；更早正确执行与后续F4Q/VPW支持一起说明prior=yes。原first_run=F4Q/A9及三支持登记历史保留，新行更正首证/进阶并补四个更早支持；其中五次攻击削盾、一次移除格挡和一次直接伤害，七次均只核敌盾归零后的眩晕反应，不给药水使用规则。')
        updates.append(row)
(O/'ledger-updates.jsonl').write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in updates))
for row in updates:
    p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'update'],input=json.dumps(row,ensure_ascii=False),capture_output=True,text=True)
    with (O/'ledger-update.log').open('a') as h:h.write(p.stdout+p.stderr)
    if p.returncode:raise RuntimeError(p.stdout+p.stderr)
p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'check'],capture_output=True,text=True)
(O/'ledger-check.log').write_text(p.stdout+p.stderr);assert p.returncode==0
result=dict(added=[],proposed=[r['id'] for r in updates],retired=[],check=0)
(O/'ledger-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
