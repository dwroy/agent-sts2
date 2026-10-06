import json
import subprocess
from pathlib import Path

O = Path(__file__).parent
ROOT = O.parents[2]
commit = (O/'commit.txt').read_text().strip()
title = (O/'changelog-title.txt').read_text().strip()
C = json.load(open(O/'changes.json'))
E = {e['id']:e for e in json.load(open(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json'))['entries']}
current = json.loads(subprocess.check_output(['python3',str(ROOT/'learner/ledger.py'),'fold','--character','silent','--json'],text=True))
L = {x['id']:x for x in current}
links = {
    'silent-metamorphosis-generated-free-attacks':['silent-0203'],
    'silent-footwork-block':['silent-0005'],
    'silent-strength-weak-observation':['silent-0006'],
    'silent-route-hp-observation':['silent-0019'],
    'silent-rest-buffer-observation':['silent-0020'],
    'silent-deck-burst-observation':['silent-0021','silent-0125'],
    'silent-noxious-fumes-growth':['silent-0011'],
    'silent-afterimage-per-card-block':['silent-0023'],
    'silent-piercing-wail-temporary-strength':['silent-0046'],
    'silent-ripple-basin-no-attack-block':['silent-0048'],
    'silent-spiked-gauntlets-power-cost':['silent-0067'],
    'silent-anticipate-temporary-dexterity':['silent-0080'],
    'silent-devoted-sculptor-ritual-growth':['silent-0083'],
    'silent-insatiable-dual-clock':['silent-0018'],
}
assert set(links)==set(C['added']+C['updated'])
updates=[]
for experience,ids in links.items():
    for id in ids:
        seen={x['run'] for x in L[id]['evidence'] if x.get('role','support')=='support'}
        runs=E[experience]['evidence'] if experience in C['added'] else C['changes'][experience]['added_evidence']
        more=[dict(run=r,role='support',note='第58节静默原始日志与复盘复核；仅非药水事实，公式、进阶、典型案例及观察限制见对应经验。') for r in runs if r not in seen]
        row=dict(id=id,by='learner:experience-update',status='proposed',where=dict(experience=[experience],commits=[commit],changelog=[title]),note='静默经验2026-10-07.4：只登记proposed；首证/先验/原claim/旧version/repeat保持，实际合入后交运维登记shipped。' + ('羽化真实生成机制与0202纯bug独立。' if id=='silent-0203' else '新支持仅非药水部分。') + ('HUV骇鳗护栏观察进入general:deck，不据未遭遇沙漏给boss条目补证。' if id=='silent-0125' else ''))
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
