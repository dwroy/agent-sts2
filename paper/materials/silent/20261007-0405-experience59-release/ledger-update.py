import collections
import json
import subprocess
from pathlib import Path

O = Path(__file__).parent
ROOT = O.parents[2]
commit = (O/'commit.txt').read_text().strip()
title = f'2026-10-07 静默猎手 第五十九次增量：1 局 A10（version 2026-10-07.5，分支 exp-silent，{commit[:8]}）'
(O/'changelog-title.txt').write_text(title+'\n')
C = json.load(open(O/'changes.json'))
E = {e['id']:e for e in json.load(open(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json'))['entries']}
fold = subprocess.check_output(['python3',str(ROOT/'learner/ledger.py'),'fold','--character','silent','--json'],text=True)
(O/'ledger-fold-before.json').write_text(fold)
L = {x['id']:x for x in json.loads(fold)}
links = {
    'silent-stone-humidifier-rest-growth':['silent-0204'],
    'silent-footwork-block':['silent-0005'],
    'silent-strength-weak-observation':['silent-0006'],
    'silent-route-hp-observation':['silent-0019'],
    'silent-rest-buffer-observation':['silent-0020'],
    'silent-deck-burst-observation':['silent-0021','silent-0125'],
    'silent-noxious-fumes-growth':['silent-0011'],
    'silent-piercing-wail-temporary-strength':['silent-0046'],
    'silent-wither-end-turn-loss':['silent-0024'],
    'silent-aeonglass-artifact-growth-sl':['silent-0025'],
    'silent-tuning-fork-skill-block':['silent-0072'],
    'silent-infested-prism-tainted-skill-cost':['silent-0167'],
}
assert set(links)==set(C['added']+C['updated'])
updates=[]
for experience,ids in links.items():
    for id in ids:
        seen={x['run'] for x in L[id]['evidence'] if x.get('role','support')=='support'}
        more=[dict(run='UMVLWER4CD98',role='support',note='第59节静默原始日志与复盘及勘误复核；仅非药水支持，进阶/数字/典型案例和观察限制见对应经验。')] if 'UMVLWER4CD98' not in seen else []
        row=dict(id=id,by='learner:experience-update',status='proposed',where=dict(experience=[experience],commits=[commit],changelog=[title]),note='静默经验2026-10-07.5：只登记proposed；首证/先验/原claim/旧version/repeat保持，交运维核实际合入登记shipped；未确认可避免的同一策略失误，不添repeat。')
        if more:row['evidence']=more
        updates.append(row)
(O/'ledger-updates.jsonl').write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in updates))
for row in updates:
    p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'update'],input=json.dumps(row,ensure_ascii=False),capture_output=True,text=True)
    with (O/'ledger-update.log').open('a') as h:h.write(p.stdout+p.stderr)
    if p.returncode:raise RuntimeError(p.stdout+p.stderr)
check=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'check'],capture_output=True,text=True)
(O/'ledger-check.log').write_text(check.stdout+check.stderr)
assert check.returncode==0
result=dict(added=[],proposed=[r['id'] for r in updates],retired=[],check=0)
(O/'ledger-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
